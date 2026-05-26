/* =========================================================
   GCTBM Lessons — Golf Lesson Booking Application
   Single-file React app (loaded via Babel standalone).
   State persisted to localStorage.
   ========================================================= */

const { useState, useEffect, useMemo, useRef } = React;

/* ---------------------------- Icons (inline SVG) --------------------------- */
const Icon = {
  Pin: (p) => (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  User: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Users: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Check: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  CheckBig: (p) => (
    <svg width={p.size||40} height={p.size||40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Calendar: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Lock: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Clock: (p) => (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  ChevRight: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  ChevLeft: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  Eye: (p) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Download: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Plus: (p) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Edit: (p) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Trash: (p) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1.5 14a2 2 0 0 1-2 1.84h-7a2 2 0 0 1-2-1.84L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
    </svg>
  ),
};

/* ----------------------------- Initial data ------------------------------ */
const LEVELS = [
  { id: "beginner", name: "Beginner", desc: "For those completely new to the sport. Handicap 54 preparation.", icon: "User" },
  { id: "intermediate", name: "Intermediate", desc: "Improving swing mechanics and course management. Handicap 36-54.", icon: "Users" },
  { id: "advanced", name: "Advanced", desc: "Competitive play strategies and fine-tuning. Handicap < 36.", icon: "Check" },
];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_PLURAL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const TIME_BLOCKS = ["17:00-18:00", "18:00-19:00", "19:00-20:00"];

const DEFAULT_SEASONS = {
  "summer-2024": { id: "summer-2024", name: "Summer 2024", startDate: "2024-04-01", price: 350 },
  "winter-2024": { id: "winter-2024", name: "Winter 2024", startDate: "2024-10-07", price: 320 },
};

const DEFAULT_LOCATIONS = {
  "tongelreep": { id: "tongelreep", name: "Tongelreep", address: "Charles Roelslaan 15", coach: "Coach Marco" },
  "gendersteyn": { id: "gendersteyn", name: "Gendersteyn", address: "Locht 140", coach: "Coach Sarah" },
};

/* Helper: build the default 12 consecutive weeks starting at a date */
function defaultWeeksFromDate(dateStr, dayOfWeek) {
  // dayOfWeek: 0..6
  const start = new Date(dateStr);
  // shift to the first occurrence of dayOfWeek on/after start
  const diff = (dayOfWeek - start.getDay() + 7) % 7;
  start.setDate(start.getDate() + diff);
  const weeks = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 7);
    weeks.push(d.toISOString().slice(0, 10));
  }
  return weeks;
}

function defaultTimeslots() {
  const s = "summer-2024";
  return [
    { id: "ts-1", season: s, location: "tongelreep", day: 1, time: "18:00-19:00", level: "intermediate", maxTrainees: 7, lessonDates: defaultWeeksFromDate(DEFAULT_SEASONS[s].startDate, 1) },
    { id: "ts-2", season: s, location: "tongelreep", day: 3, time: "19:00-20:00", level: "intermediate", maxTrainees: 7, lessonDates: defaultWeeksFromDate(DEFAULT_SEASONS[s].startDate, 3) },
    { id: "ts-3", season: s, location: "tongelreep", day: 2, time: "17:00-18:00", level: "beginner", maxTrainees: 7, lessonDates: defaultWeeksFromDate(DEFAULT_SEASONS[s].startDate, 2) },
    { id: "ts-4", season: s, location: "tongelreep", day: 4, time: "19:00-20:00", level: "advanced", maxTrainees: 7, lessonDates: defaultWeeksFromDate(DEFAULT_SEASONS[s].startDate, 4) },
    { id: "ts-5", season: s, location: "gendersteyn", day: 2, time: "18:00-19:00", level: "beginner", maxTrainees: 7, lessonDates: defaultWeeksFromDate(DEFAULT_SEASONS[s].startDate, 2) },
    { id: "ts-6", season: s, location: "gendersteyn", day: 4, time: "17:00-18:00", level: "intermediate", maxTrainees: 7, lessonDates: defaultWeeksFromDate(DEFAULT_SEASONS[s].startDate, 4) },
    { id: "ts-7", season: s, location: "gendersteyn", day: 5, time: "19:00-20:00", level: "advanced", maxTrainees: 7, lessonDates: defaultWeeksFromDate(DEFAULT_SEASONS[s].startDate, 5) },
  ];
}

const DEFAULT_BOOKINGS = [
  // Pre-fill a few so the "X left" badge shows real numbers from the screenshots
  { id: "b-1", timeslotId: "ts-1", name: "Lars Janssen", email: "lars@example.com", phone: "+31 6 11111111", status: "booked", bookedAt: "2024-03-12T10:00:00Z", attendance: {} },
  { id: "b-2", timeslotId: "ts-1", name: "Emma de Vries", email: "emma@example.com", phone: "+31 6 22222222", status: "booked", bookedAt: "2024-03-13T10:00:00Z", attendance: {} },
];

const STORAGE_KEY = "swingmaster.state.v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    currentSeason: "summer-2024",
    seasons: DEFAULT_SEASONS,
    locations: DEFAULT_LOCATIONS,
    timeslots: defaultTimeslots(),
    bookings: DEFAULT_BOOKINGS,
  };
}

function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
}

/* ----------------------------- Util functions ---------------------------- */
const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const formatShortDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};
const formatMonthDay = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ICS file generation for "Add to Calendar" */
function buildICS({ summary, location, description, dates, time }) {
  // time is "HH:MM-HH:MM"
  const [start, end] = time.split("-");
  const fmt = (dateISO, hm) => {
    const d = new Date(dateISO + "T" + hm + ":00");
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";
  };
  let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GCTBM Lessons//Golf//EN\r\n";
  for (const date of dates) {
    ics += "BEGIN:VEVENT\r\n";
    ics += `UID:${date}-${Math.random().toString(36).slice(2,8)}@gctbm-lessons\r\n`;
    ics += `DTSTAMP:${fmt(date, "00:00")}\r\n`;
    ics += `DTSTART:${fmt(date, start)}\r\n`;
    ics += `DTEND:${fmt(date, end)}\r\n`;
    ics += `SUMMARY:${summary}\r\n`;
    ics += `LOCATION:${location}\r\n`;
    ics += `DESCRIPTION:${description}\r\n`;
    ics += "END:VEVENT\r\n";
  }
  ics += "END:VCALENDAR\r\n";
  return ics;
}
function downloadICS(filename, content) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

/* ============================== APP ============================== */
function App() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState({ name: "booking", step: 1 });   // 'booking' | 'calendar' | 'admin' | 'checkin'
  const [draft, setDraft] = useState({ level: null, location: null, timeslotId: null, name: "", email: "", phone: "" });

  useEffect(() => { saveState(state); }, [state]);

  const update = (fn) => setState((s) => {
    const next = typeof fn === "function" ? fn(s) : fn;
    return { ...next };
  });

  const goto = (name, extra = {}) => setView({ name, ...extra });

  const currentSeasonObj = state.seasons[state.currentSeason];

  return (
    <div className="app-shell">
      <Header
        seasonName={currentSeasonObj?.name}
        view={view}
        onNav={goto}
        onSeasonChange={(id) => update((s) => ({ ...s, currentSeason: id }))}
        seasons={state.seasons}
      />

      {view.name === "booking" && (
        <BookingFlow
          state={state}
          setState={update}
          draft={draft}
          setDraft={setDraft}
          view={view}
          setView={setView}
        />
      )}

      {view.name === "calendar" && (
        <CalendarView state={state} />
      )}

      {view.name === "admin" && (
        <AdminPanel state={state} setState={update} />
      )}

      {view.name === "checkin" && (
        <CheckinPortal state={state} setState={update} />
      )}
    </div>
  );
}

/* ============================== HEADER ============================== */
function Header({ seasonName, view, onNav, onSeasonChange, seasons }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="header">
      <button className="brand" onClick={() => onNav("booking", { step: 1 })} style={{background: "none", border: "none", padding: 0, cursor: "pointer"}}>
        <div className="brand-icon"><Icon.Pin size={22} /></div>
        <h1 className="brand-name">GCTBM Lessons</h1>
      </button>
      <div className="header-actions">
        <button className="season-badge" onClick={() => setOpen(!open)} style={{cursor: "pointer", border: "1px solid rgba(196, 181, 253, 0.6)"}}>
          {seasonName?.split(" ")[0]} <span className="yr">{seasonName?.split(" ")[1]}</span>
        </button>
        {open && (
          <div style={{position: "absolute", top: 70, right: 20, background: "white", borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 8, zIndex: 30, minWidth: 180}}>
            {Object.values(seasons).map((s) => (
              <button key={s.id} className="admin-tab" style={{textAlign: "left", display: "block", width: "100%"}} onClick={() => { onSeasonChange(s.id); setOpen(false); }}>
                {s.name}
              </button>
            ))}
          </div>
        )}
        <div className="icon-group">
          <button className={`icon-btn ${view.name === "checkin" ? "active" : ""}`} title="Trainee Check-In" onClick={() => onNav("checkin")}><Icon.User /></button>
          <button className={`icon-btn ${view.name === "calendar" ? "active" : ""}`} title="Season Calendar" onClick={() => onNav("calendar")}><Icon.Calendar /></button>
          <button className={`icon-btn ${view.name === "admin" ? "active" : ""}`} title="Admin" onClick={() => onNav("admin")}><Icon.Lock /></button>
        </div>
      </div>
    </div>
  );
}

/* ============================== BOOKING FLOW ============================== */
function BookingFlow({ state, setState, draft, setDraft, view, setView }) {
  const totalSteps = 5;
  const step = view.step || 1;

  const goToStep = (n, payload = {}) => {
    setDraft((d) => ({ ...d, ...payload }));
    setView({ name: "booking", step: n });
  };

  return (
    <>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${(step / totalSteps) * 100}%` }} />
      </div>

      <div className="step-row">
        {step > 1 && step < 5 && (
          <button className="back-link" onClick={() => goToStep(step - 1)}>
            <Icon.ChevLeft size={14} /> Back
          </button>
        )}
        {step < 5 && (
          <>
            <span className="step-label">Step {step}</span>
            <span className="step-divider">|</span>
            <span className="step-name">Booking Process</span>
          </>
        )}
      </div>

      {step === 1 && <Step1Level onPick={(level) => goToStep(2, { level })} />}
      {step === 2 && <Step2Location locations={state.locations} onPick={(location) => goToStep(3, { location })} />}
      {step === 3 && (
        <Step3Timeslot
          state={state}
          draft={draft}
          onPick={(timeslotId) => goToStep(4, { timeslotId })}
        />
      )}
      {step === 4 && (
        <Step4Confirm
          state={state}
          setState={setState}
          draft={draft}
          setDraft={setDraft}
          onComplete={(bookingId, isWaitlist) => goToStep(5, { bookingId, isWaitlist })}
        />
      )}
      {step === 5 && (
        <Step5Success
          state={state}
          draft={draft}
          isWaitlist={view.isWaitlist}
          onReset={() => { setDraft({ level: null, location: null, timeslotId: null, name: "", email: "", phone: "" }); setView({ name: "booking", step: 1 }); }}
        />
      )}
    </>
  );
}

/* --- Step 1: Level --- */
function Step1Level({ onPick }) {
  return (
    <div className="glass-card">
      <h2 className="title">Select Your Level</h2>
      <p className="subtitle">Choose the program that fits your goals.</p>
      <div className="option-list">
        {LEVELS.map((lvl) => {
          const IconCmp = Icon[lvl.icon];
          return (
            <button key={lvl.id} className="option-card" onClick={() => onPick(lvl.id)}>
              <div className="option-icon"><IconCmp size={22} /></div>
              <div className="option-body">
                <h3 className="option-title">{lvl.name}</h3>
                <p className="option-sub">{lvl.desc}</p>
              </div>
              <div className="option-arrow"><Icon.ChevRight /></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* --- Step 2: Location --- */
function Step2Location({ locations, onPick }) {
  return (
    <div className="glass-card">
      <h2 className="title">Choose Location</h2>
      <p className="subtitle">We have two premium facilities available.</p>
      <div className="option-list">
        {Object.values(locations).map((loc) => (
          <button key={loc.id} className="location-card" onClick={() => onPick(loc.id)}>
            <div className="location-icon"><Icon.Pin size={28} /></div>
            <h3 className="location-name">{loc.name}</h3>
            <p className="location-addr">{loc.address}</p>
            <span className="coach-pill">{loc.coach}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* --- Step 3: Timeslots --- */
function Step3Timeslot({ state, draft, onPick }) {
  const [scheduleFor, setScheduleFor] = useState(null);

  const slots = state.timeslots.filter(
    (t) => t.season === state.currentSeason && t.location === draft.location && t.level === draft.level
  );

  const counts = useMemo(() => {
    const c = {};
    for (const ts of slots) {
      c[ts.id] = state.bookings.filter((b) => b.timeslotId === ts.id && b.status === "booked").length;
    }
    return c;
  }, [slots, state.bookings]);

  const location = state.locations[draft.location];

  return (
    <div className="glass-card">
      <h2 className="title">Available Timeslots</h2>
      <p className="subtitle">Showing <b>{cap(draft.level)}</b> slots at <b>{location?.name}</b></p>

      {slots.length === 0 ? (
        <div className="empty-state">
          <div className="ico"><Icon.Clock size={26} /></div>
          <p>No timeslots configured for this combination yet.<br/>Please choose a different level or location.</p>
        </div>
      ) : (
        <div className="option-list">
          {slots.map((ts) => {
            const booked = counts[ts.id] || 0;
            const left = ts.maxTrainees - booked;
            const isFull = left <= 0;
            const startDate = ts.lessonDates[0];
            const endDate = ts.lessonDates[ts.lessonDates.length - 1];
            return (
              <div key={ts.id} className="timeslot-card">
                <div className="ts-head">
                  <div className="ts-clock"><Icon.Clock /></div>
                  <div style={{flex: 1}}>
                    <h3 className="ts-day">{DAY_PLURAL[ts.day]}</h3>
                    <div className="ts-time-row">
                      <span className="ts-time">{ts.time}</span>
                      <button className="ts-link" onClick={() => setScheduleFor(ts)}>
                        <Icon.Eye /> View Schedule
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  className={`ts-cta ${isFull ? "waitlist" : ""}`}
                  onClick={() => onPick(ts.id)}
                >
                  {isFull ? "Join Waitlist" : `Book Now (${left} left)`}
                </button>
                <div className="ts-meta">
                  <span><span className="label">Starts:</span> <span className="pill">{formatShortDate(startDate)}</span></span>
                  <span className="dot">•</span>
                  <span><span className="label">Ends:</span> <span className="pill">{formatShortDate(endDate)}</span></span>
                  <span className="dot">•</span>
                  <button className="course-link" style={{background: "none", border: "none", padding: 0, fontFamily: "inherit", cursor: "pointer"}} onClick={() => setScheduleFor(ts)}>
                    {ts.lessonDates.length} Weeks Course
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {scheduleFor && (
        <ScheduleModal timeslot={scheduleFor} location={location} onClose={() => setScheduleFor(null)} />
      )}
    </div>
  );
}

function ScheduleModal({ timeslot, location, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Course Schedule</h3>
        <p className="muted" style={{margin: "0 0 16px", fontSize: "0.9rem"}}>
          {DAY_PLURAL[timeslot.day]} • {timeslot.time} • {location?.name}
        </p>
        <div className="lesson-list">
          {timeslot.lessonDates.map((d, i) => (
            <div key={d} className="lesson-row">
              <div className="lesson-info">
                <span className="lesson-week">Lesson {i + 1}</span>
                <span className="lesson-date">{formatShortDate(d)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="primary-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* --- Step 4: Confirm & Pay --- */
function Step4Confirm({ state, setState, draft, setDraft, onComplete }) {
  const ts = state.timeslots.find((t) => t.id === draft.timeslotId);
  const loc = state.locations[ts.location];
  const season = state.seasons[state.currentSeason];
  const bookedCount = state.bookings.filter((b) => b.timeslotId === ts.id && b.status === "booked").length;
  const isWaitlist = bookedCount >= ts.maxTrainees;

  const ready = draft.name.trim() && draft.email.trim() && draft.phone.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ready) return;
    const newBooking = {
      id: uid("b"),
      timeslotId: ts.id,
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      status: isWaitlist ? "waitlist" : "booked",
      bookedAt: new Date().toISOString(),
      attendance: {},
    };
    setState((s) => ({ ...s, bookings: [...s.bookings, newBooking] }));
    setDraft((d) => ({ ...d, bookingId: newBooking.id }));
    onComplete(newBooking.id, isWaitlist);
  };

  return (
    <div className="glass-card">
      <h2 className="title">Confirm & Pay</h2>
      <p className="subtitle">Please review your course details.</p>

      <div className="confirm-table">
        <div className="confirm-row">
          <span className="lbl">Course</span>
          <span className="val">{cap(ts.level)} Golf</span>
        </div>
        <div className="confirm-row">
          <span className="lbl">Location</span>
          <span className="val">{loc.name}</span>
        </div>
        <div className="confirm-row">
          <span className="lbl">Coach</span>
          <span className="val">{loc.coach}</span>
        </div>
        <div className="confirm-row">
          <span className="lbl">Schedule</span>
          <span className="val">{DAY_PLURAL[ts.day]} @ {ts.time}</span>
        </div>
        <div className="confirm-row total">
          <span className="lbl">Total Price</span>
          <span className="val">€{season.price.toFixed(2)}</span>
        </div>
      </div>

      {isWaitlist && (
        <div style={{padding: 12, background: "rgba(245, 158, 11, 0.15)", color: "var(--amber-500)", borderRadius: 10, marginBottom: 16, fontSize: "0.88rem", fontWeight: 600, textAlign: "center"}}>
          This timeslot is full. You will be added to the waiting list.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <h4 className="form-section-title">Trainee Details</h4>
        <input className="form-input" type="text" placeholder="Full Name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
        <input className="form-input" type="email" placeholder="Email Address" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
        <input className="form-input" type="tel" placeholder="Phone Number" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
        <button className="primary-btn" type="submit" disabled={!ready}>
          {isWaitlist ? "Join Waitlist" : "Proceed to Payment"}
        </button>
      </form>
    </div>
  );
}

/* --- Step 5: Success --- */
function Step5Success({ state, draft, isWaitlist, onReset }) {
  const ts = state.timeslots.find((t) => t.id === draft.timeslotId);
  const loc = state.locations[ts.location];
  const handleAddCalendar = () => {
    const ics = buildICS({
      summary: `${cap(ts.level)} Golf @ ${loc.name}`,
      location: `${loc.name} — ${loc.address}`,
      description: `Coach: ${loc.coach}. Course: ${ts.lessonDates.length} lessons.`,
      dates: ts.lessonDates,
      time: ts.time,
    });
    downloadICS(`gctbm-lessons-${ts.id}.ics`, ics);
  };
  return (
    <div className="glass-card">
      <div className="success-wrap">
        <div className="success-circle"><Icon.CheckBig size={44} /></div>
        <h2>{isWaitlist ? "Added to Waitlist!" : "Booking Initiated!"}</h2>
        <p>
          {isWaitlist
            ? "We'll contact you as soon as a spot opens up. Your calendar template has been prepared as well."
            : "You are being redirected to the secure payment portal. We have also prepared your calendar schedule."}
        </p>
        <div className="success-actions">
          <button className="secondary-btn" onClick={handleAddCalendar}>
            <Icon.Download size={16} /> Add to Calendar
          </button>
          <button className="primary-btn" onClick={() => {
            if (!isWaitlist) {
              window.open("https://www.gctbm.nl/lessons-register.php", "_blank", "noopener");
            }
            onReset();
          }}>
            {isWaitlist ? "Done →" : "Go to Payment →"}
          </button>
        </div>
        <div className="success-footer">
          Confirmation sent to <b>{draft.email}</b>
        </div>
      </div>
    </div>
  );
}

/* ============================== CALENDAR VIEW ============================== */
function CalendarView({ state }) {
  const season = state.seasons[state.currentSeason];
  const startDate = new Date(season.startDate);
  const [month, setMonth] = useState(new Date(startDate.getFullYear(), startDate.getMonth(), 1));

  // Find all lessons in the current month
  const lessonsByDate = useMemo(() => {
    const map = {};
    state.timeslots
      .filter((ts) => ts.season === state.currentSeason)
      .forEach((ts) => {
        ts.lessonDates.forEach((d) => {
          if (!map[d]) map[d] = [];
          map[d].push(ts);
        });
      });
    return map;
  }, [state.timeslots, state.currentSeason]);

  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDow = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d) => d && today.getFullYear() === year && today.getMonth() === m && today.getDate() === d;

  const totalLessons = Object.values(lessonsByDate).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <div className="glass-card">
      <h2 className="title">Season Calendar</h2>
      <p className="subtitle">{season.name} — {totalLessons} lessons across {state.timeslots.filter(t => t.season === state.currentSeason).length} courses</p>

      <div className="cal-month-nav">
        <button className="cal-nav-btn" onClick={() => setMonth(new Date(year, m - 1, 1))}><Icon.ChevLeft /></button>
        <h3 className="cal-month-name">{month.toLocaleString("en-GB", { month: "long", year: "numeric" })}</h3>
        <button className="cal-nav-btn" onClick={() => setMonth(new Date(year, m + 1, 1))}><Icon.ChevRight /></button>
      </div>

      <div className="cal-grid">
        {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="cal-cell empty" />;
          const iso = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const lessons = lessonsByDate[iso] || [];
          return (
            <div key={i} className={`cal-cell ${lessons.length ? "has-lesson" : ""} ${isToday(d) ? "today" : ""}`}>
              <span className="cal-day-num">{d}</span>
              <div className="cal-lesson-list">
                {lessons.slice(0, 2).map((ts, idx) => (
                  <span key={idx} className="cal-lesson-chip" title={`${cap(ts.level)} • ${state.locations[ts.location].name} • ${ts.time}`}>
                    {ts.time.split("-")[0]} {cap(ts.level).slice(0, 3)}
                  </span>
                ))}
                {lessons.length > 2 && <span className="cal-lesson-chip">+{lessons.length - 2}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="divider-thin" />
      <h4 style={{marginTop: 0}}>Upcoming Lessons This Month</h4>
      <div className="lesson-list">
        {Object.entries(lessonsByDate)
          .filter(([d]) => {
            const dt = new Date(d);
            return dt.getFullYear() === year && dt.getMonth() === m;
          })
          .sort()
          .slice(0, 10)
          .map(([d, slots]) => (
            <div key={d} className="lesson-row">
              <div className="lesson-info">
                <span className="lesson-week">{formatShortDate(d)}</span>
                <span className="lesson-date">{slots.map((s) => `${cap(s.level)} • ${state.locations[s.location].name} • ${s.time}`).join(" / ")}</span>
              </div>
              <span className="attendance-badge upcoming">{slots.length} lesson{slots.length > 1 ? "s" : ""}</span>
            </div>
          ))}
        {Object.entries(lessonsByDate).filter(([d]) => new Date(d).getMonth() === m && new Date(d).getFullYear() === year).length === 0 && (
          <p className="muted center" style={{padding: "20px 0"}}>No lessons scheduled for this month.</p>
        )}
      </div>
    </div>
  );
}

/* ============================== ADMIN PANEL ============================== */
function AdminPanel({ state, setState }) {
  const [tab, setTab] = useState("timeslots");
  return (
    <div className="glass-card">
      <h2 className="title">Admin Console</h2>
      <p className="subtitle">Manage seasons, locations, schedules and trainees.</p>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === "timeslots" ? "active" : ""}`} onClick={() => setTab("timeslots")}>Timeslots</button>
        <button className={`admin-tab ${tab === "trainees" ? "active" : ""}`} onClick={() => setTab("trainees")}>Trainees</button>
        <button className={`admin-tab ${tab === "seasons" ? "active" : ""}`} onClick={() => setTab("seasons")}>Seasons</button>
        <button className={`admin-tab ${tab === "locations" ? "active" : ""}`} onClick={() => setTab("locations")}>Locations</button>
      </div>

      {tab === "timeslots" && <AdminTimeslots state={state} setState={setState} />}
      {tab === "trainees" && <AdminTrainees state={state} setState={setState} />}
      {tab === "seasons" && <AdminSeasons state={state} setState={setState} />}
      {tab === "locations" && <AdminLocations state={state} setState={setState} />}
    </div>
  );
}

/* --- Admin: Timeslots --- */
function AdminTimeslots({ state, setState }) {
  const [editing, setEditing] = useState(null); // timeslot or "new"
  const [locFilter, setLocFilter] = useState("all");

  const slots = state.timeslots
    .filter((t) => t.season === state.currentSeason)
    .filter((t) => locFilter === "all" || t.location === locFilter);

  const handleSave = (ts) => {
    setState((s) => {
      const exists = s.timeslots.some((x) => x.id === ts.id);
      const list = exists ? s.timeslots.map((x) => (x.id === ts.id ? ts : x)) : [...s.timeslots, ts];
      return { ...s, timeslots: list };
    });
    setEditing(null);
  };
  const handleDelete = (id) => {
    if (!confirm("Delete this timeslot? Existing bookings will remain but be orphaned.")) return;
    setState((s) => ({ ...s, timeslots: s.timeslots.filter((t) => t.id !== id) }));
  };

  return (
    <div>
      <div className="admin-section-head">
        <div>
          <h3 className="admin-section-title">Timeslot Schedule</h3>
          <p className="muted" style={{margin: 0, fontSize: "0.85rem"}}>{state.seasons[state.currentSeason].name}</p>
        </div>
        <div style={{display: "flex", gap: 8, alignItems: "center"}}>
          <select className="form-select" style={{width: "auto", marginBottom: 0, padding: "8px 12px"}} value={locFilter} onChange={(e) => setLocFilter(e.target.value)}>
            <option value="all">All locations</option>
            {Object.values(state.locations).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <button className="add-btn" onClick={() => setEditing({
            id: uid("ts"),
            season: state.currentSeason,
            location: Object.keys(state.locations)[0],
            day: 1,
            time: TIME_BLOCKS[1],
            level: "beginner",
            maxTrainees: 7,
            lessonDates: defaultWeeksFromDate(state.seasons[state.currentSeason].startDate, 1),
            isNew: true,
          })}>
            <Icon.Plus /> Add
          </button>
        </div>
      </div>

      <div style={{overflowX: "auto"}}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Location</th>
              <th>Day</th>
              <th>Time</th>
              <th>Level</th>
              <th>Max</th>
              <th>Booked</th>
              <th>Lessons</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {slots.length === 0 && (
              <tr><td colSpan="8" className="center muted" style={{padding: 20}}>No timeslots configured. Click "Add" to start.</td></tr>
            )}
            {slots.map((t) => {
              const booked = state.bookings.filter((b) => b.timeslotId === t.id && b.status === "booked").length;
              const wait = state.bookings.filter((b) => b.timeslotId === t.id && b.status === "waitlist").length;
              return (
                <tr key={t.id}>
                  <td>{state.locations[t.location]?.name}</td>
                  <td>{DAY_NAMES[t.day]}</td>
                  <td>{t.time}</td>
                  <td>{cap(t.level)}</td>
                  <td>{t.maxTrainees}</td>
                  <td>{booked}{wait > 0 && <span className="muted"> (+{wait} wait)</span>}</td>
                  <td>{t.lessonDates.length}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="row-action" onClick={() => setEditing(t)}><Icon.Edit /> Edit</button>
                      <button className="row-action danger" onClick={() => handleDelete(t.id)}><Icon.Trash /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <TimeslotEditor
          timeslot={editing}
          state={state}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TimeslotEditor({ timeslot, state, onSave, onClose }) {
  const [t, setT] = useState({ ...timeslot });
  const season = state.seasons[t.season];

  // when day changes, regenerate dates aligned to that day-of-week starting from season start
  useEffect(() => {
    if (timeslot.isNew) {
      setT((cur) => ({ ...cur, lessonDates: defaultWeeksFromDate(season.startDate, cur.day) }));
    }
    // eslint-disable-next-line
  }, []);

  const regenDates = (day) => {
    setT((cur) => ({ ...cur, day, lessonDates: defaultWeeksFromDate(season.startDate, day) }));
  };

  const updateDate = (idx, newDate) => {
    setT((cur) => {
      const next = [...cur.lessonDates];
      next[idx] = newDate;
      return { ...cur, lessonDates: next };
    });
  };

  const addLesson = () => {
    const last = t.lessonDates[t.lessonDates.length - 1];
    const d = last ? new Date(last) : new Date(season.startDate);
    d.setDate(d.getDate() + 7);
    setT((cur) => ({ ...cur, lessonDates: [...cur.lessonDates, d.toISOString().slice(0, 10)] }));
  };
  const removeLesson = (i) => {
    setT((cur) => ({ ...cur, lessonDates: cur.lessonDates.filter((_, idx) => idx !== i) }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{timeslot.isNew ? "Add Timeslot" : "Edit Timeslot"}</h3>

        <label className="field-label">Location</label>
        <select className="form-select" value={t.location} onChange={(e) => setT({ ...t, location: e.target.value })}>
          {Object.values(state.locations).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        <label className="field-label">Day of week</label>
        <select className="form-select" value={t.day} onChange={(e) => regenDates(Number(e.target.value))}>
          {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>

        <label className="field-label">Time</label>
        <select className="form-select" value={t.time} onChange={(e) => setT({ ...t, time: e.target.value })}>
          {TIME_BLOCKS.map((tb) => <option key={tb} value={tb}>{tb}</option>)}
        </select>

        <label className="field-label">Level</label>
        <select className="form-select" value={t.level} onChange={(e) => setT({ ...t, level: e.target.value })}>
          {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        <label className="field-label">Max trainees</label>
        <input className="form-input" type="number" min="1" max="50" value={t.maxTrainees} onChange={(e) => setT({ ...t, maxTrainees: Number(e.target.value) })} />

        <label className="field-label">Lesson dates ({t.lessonDates.length})</label>
        <div style={{maxHeight: 200, overflowY: "auto", border: "1px solid var(--gray-200)", borderRadius: 10, padding: 8}}>
          {t.lessonDates.map((d, i) => (
            <div key={i} style={{display: "flex", gap: 6, alignItems: "center", marginBottom: 6}}>
              <span style={{minWidth: 60, fontSize: "0.85rem", color: "var(--gray-500)", fontWeight: 600}}>#{i + 1}</span>
              <input type="date" className="form-input" style={{marginBottom: 0, padding: "8px 10px", flex: 1}} value={d} onChange={(e) => updateDate(i, e.target.value)} />
              <button className="row-action danger" onClick={() => removeLesson(i)}><Icon.Trash /></button>
            </div>
          ))}
          <button className="add-btn" type="button" onClick={addLesson} style={{marginTop: 4}}><Icon.Plus /> Add Lesson</button>
        </div>

        <div className="modal-actions">
          <button className="secondary-btn" onClick={onClose}>Cancel</button>
          <button className="primary-btn" onClick={() => onSave({ ...t, isNew: undefined })}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* --- Admin: Trainees per Timeslot --- */
function AdminTrainees({ state, setState }) {
  const slots = state.timeslots.filter((t) => t.season === state.currentSeason);
  const [selected, setSelected] = useState(slots[0]?.id || null);

  const ts = state.timeslots.find((t) => t.id === selected);
  const bookings = ts ? state.bookings.filter((b) => b.timeslotId === selected) : [];

  const removeBooking = (id) => {
    if (!confirm("Remove this trainee from the timeslot?")) return;
    setState((s) => ({ ...s, bookings: s.bookings.filter((b) => b.id !== id) }));
  };

  const promote = (id) => {
    setState((s) => ({
      ...s,
      bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: "booked" } : b)),
    }));
  };

  return (
    <div>
      <h3 className="admin-section-title">Trainees per Timeslot</h3>
      <label className="field-label">Choose a timeslot</label>
      <select className="form-select" value={selected || ""} onChange={(e) => setSelected(e.target.value)}>
        {slots.map((t) => (
          <option key={t.id} value={t.id}>
            {state.locations[t.location]?.name} • {DAY_NAMES[t.day]} • {t.time} • {cap(t.level)}
          </option>
        ))}
      </select>

      <div className="divider-thin" />

      {!ts && <p className="muted center">No timeslots available.</p>}
      {ts && (
        <>
          <div className="attendance-summary">
            <div className="summary-stat">
              <div className="num">{bookings.filter((b) => b.status === "booked").length}/{ts.maxTrainees}</div>
              <div className="lbl">Booked</div>
            </div>
            <div className="summary-stat">
              <div className="num">{bookings.filter((b) => b.status === "waitlist").length}</div>
              <div className="lbl">Waitlist</div>
            </div>
            <div className="summary-stat">
              <div className="num">{ts.lessonDates.length}</div>
              <div className="lbl">Lessons</div>
            </div>
          </div>

          {bookings.length === 0 && <p className="muted center" style={{padding: "20px 0"}}>No bookings yet for this timeslot.</p>}

          {bookings.map((b) => {
            const attended = Object.values(b.attendance || {}).filter(Boolean).length;
            return (
              <div key={b.id} className="trainee-row">
                <div className="info">
                  <span className="trainee-name">{b.name}</span>
                  <span className="trainee-contact">{b.email} • {b.phone}</span>
                  <span className="trainee-contact">Attended {attended}/{ts.lessonDates.length} lessons</span>
                </div>
                <div style={{display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end"}}>
                  <span className={`trainee-status ${b.status}`}>{b.status}</span>
                  <div style={{display: "flex", gap: 4}}>
                    {b.status === "waitlist" && <button className="row-action" onClick={() => promote(b.id)}>Promote</button>}
                    <button className="row-action danger" onClick={() => removeBooking(b.id)}><Icon.Trash /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

/* --- Admin: Seasons --- */
function AdminSeasons({ state, setState }) {
  const [editing, setEditing] = useState(null);

  const handleSave = (season) => {
    setState((s) => {
      const next = { ...s.seasons, [season.id]: season };
      return { ...s, seasons: next };
    });
    setEditing(null);
  };
  const handleDelete = (id) => {
    if (Object.keys(state.seasons).length <= 1) { alert("At least one season is required."); return; }
    if (!confirm("Delete this season? All timeslots in it will also be deleted.")) return;
    setState((s) => {
      const next = { ...s.seasons };
      delete next[id];
      return {
        ...s,
        seasons: next,
        timeslots: s.timeslots.filter((t) => t.season !== id),
        currentSeason: s.currentSeason === id ? Object.keys(next)[0] : s.currentSeason,
      };
    });
  };

  return (
    <div>
      <div className="admin-section-head">
        <h3 className="admin-section-title">Seasons</h3>
        <button className="add-btn" onClick={() => setEditing({ id: "", name: "", startDate: new Date().toISOString().slice(0, 10), price: 350, isNew: true })}>
          <Icon.Plus /> Add
        </button>
      </div>
      <table className="admin-table">
        <thead>
          <tr><th>Name</th><th>Starts</th><th>Price</th><th>Active</th><th></th></tr>
        </thead>
        <tbody>
          {Object.values(state.seasons).map((s) => (
            <tr key={s.id}>
              <td><b>{s.name}</b></td>
              <td>{formatShortDate(s.startDate)}</td>
              <td>€{s.price}</td>
              <td>{s.id === state.currentSeason ? <span className="trainee-status booked">Active</span> : (
                <button className="row-action" onClick={() => setState((st) => ({ ...st, currentSeason: s.id }))}>Set Active</button>
              )}</td>
              <td>
                <div className="admin-row-actions">
                  <button className="row-action" onClick={() => setEditing(s)}><Icon.Edit /></button>
                  <button className="row-action danger" onClick={() => handleDelete(s.id)}><Icon.Trash /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing.isNew ? "Add Season" : "Edit Season"}</h3>
            <label className="field-label">Name (e.g. Summer 2025)</label>
            <input className="form-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, id: editing.isNew ? e.target.value.toLowerCase().replace(/\s+/g, "-") : editing.id })} />
            <label className="field-label">Start date</label>
            <input className="form-input" type="date" value={editing.startDate} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} />
            <label className="field-label">Total price (€)</label>
            <input className="form-input" type="number" min="0" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="primary-btn" disabled={!editing.name || !editing.id} onClick={() => handleSave({ ...editing, isNew: undefined })}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Admin: Locations --- */
function AdminLocations({ state, setState }) {
  const [editing, setEditing] = useState(null);
  const handleSave = (loc) => {
    setState((s) => ({ ...s, locations: { ...s.locations, [loc.id]: loc } }));
    setEditing(null);
  };
  const handleDelete = (id) => {
    if (!confirm("Delete this location? Its timeslots will also be deleted.")) return;
    setState((s) => {
      const next = { ...s.locations }; delete next[id];
      return { ...s, locations: next, timeslots: s.timeslots.filter((t) => t.location !== id) };
    });
  };
  return (
    <div>
      <div className="admin-section-head">
        <h3 className="admin-section-title">Locations & Coaches</h3>
        <button className="add-btn" onClick={() => setEditing({ id: "", name: "", address: "", coach: "", isNew: true })}><Icon.Plus /> Add</button>
      </div>
      <table className="admin-table">
        <thead><tr><th>Name</th><th>Address</th><th>Coach</th><th></th></tr></thead>
        <tbody>
          {Object.values(state.locations).map((l) => (
            <tr key={l.id}>
              <td><b>{l.name}</b></td>
              <td>{l.address}</td>
              <td>{l.coach}</td>
              <td>
                <div className="admin-row-actions">
                  <button className="row-action" onClick={() => setEditing(l)}><Icon.Edit /></button>
                  <button className="row-action danger" onClick={() => handleDelete(l.id)}><Icon.Trash /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing.isNew ? "Add Location" : "Edit Location"}</h3>
            <label className="field-label">Name</label>
            <input className="form-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, id: editing.isNew ? e.target.value.toLowerCase().replace(/\s+/g, "-") : editing.id })} />
            <label className="field-label">Address</label>
            <input className="form-input" value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
            <label className="field-label">Coach</label>
            <input className="form-input" value={editing.coach} onChange={(e) => setEditing({ ...editing, coach: e.target.value })} />
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="primary-btn" disabled={!editing.name || !editing.id} onClick={() => handleSave({ ...editing, isNew: undefined })}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== CHECK-IN PORTAL ============================== */
function CheckinPortal({ state, setState }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const myBookings = state.bookings.filter((b) => b.email.toLowerCase().trim() === email.toLowerCase().trim() && b.status === "booked");

  const toggleAttended = (bookingId, date) => {
    setState((s) => ({
      ...s,
      bookings: s.bookings.map((b) => {
        if (b.id !== bookingId) return b;
        const att = { ...(b.attendance || {}) };
        att[date] = !att[date];
        return { ...b, attendance: att };
      }),
    }));
  };

  return (
    <div className="glass-card">
      <h2 className="title">Trainee Check-In</h2>
      <p className="subtitle">Enter your email to view and check in to your upcoming lessons.</p>

      <input
        className="form-input"
        type="email"
        placeholder="Email Address"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setSubmitted(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") setSubmitted(true); }}
      />
      <button className="primary-btn" onClick={() => setSubmitted(true)} disabled={!email.trim()}>
        Find My Lessons
      </button>

      {submitted && (
        <div style={{marginTop: 24}}>
          {myBookings.length === 0 && (
            <div className="empty-state">
              <div className="ico"><Icon.User size={24} /></div>
              <p>No active bookings found for this email.</p>
            </div>
          )}

          {myBookings.map((b) => {
            const ts = state.timeslots.find((t) => t.id === b.timeslotId);
            if (!ts) return null;
            const loc = state.locations[ts.location];
            const total = ts.lessonDates.length;
            const attended = Object.values(b.attendance || {}).filter(Boolean).length;
            const today = new Date().toISOString().slice(0, 10);
            return (
              <div key={b.id} className="checkin-card">
                <h3 style={{margin: "0 0 4px"}}>{cap(ts.level)} Golf @ {loc.name}</h3>
                <p className="muted" style={{margin: 0}}>{DAY_PLURAL[ts.day]} • {ts.time} • {loc.coach}</p>

                <div className="attendance-summary" style={{marginTop: 18}}>
                  <div className="summary-stat">
                    <div className="num">{attended}</div>
                    <div className="lbl">Attended</div>
                  </div>
                  <div className="summary-stat">
                    <div className="num">{total - attended}</div>
                    <div className="lbl">Remaining</div>
                  </div>
                  <div className="summary-stat">
                    <div className="num">{Math.round((attended / total) * 100)}%</div>
                    <div className="lbl">Progress</div>
                  </div>
                </div>

                <h4 style={{textAlign: "left", margin: "16px 0 10px"}}>Lessons</h4>
                <div className="lesson-list" style={{textAlign: "left"}}>
                  {ts.lessonDates.map((d, i) => {
                    const past = d < today;
                    const isToday = d === today;
                    const checked = !!(b.attendance && b.attendance[d]);
                    return (
                      <div key={d} className="lesson-row">
                        <div className="lesson-info">
                          <span className="lesson-week">Lesson {i + 1}</span>
                          <span className="lesson-date">{formatShortDate(d)}{isToday && " • Today"}</span>
                        </div>
                        {isToday || past ? (
                          <button className={`check-toggle ${checked ? "on" : ""}`} onClick={() => toggleAttended(b.id, d)}>
                            {checked ? <><Icon.Check size={14} /> Checked In</> : "Check In"}
                          </button>
                        ) : (
                          <span className="attendance-badge upcoming">Upcoming</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================== RENDER ============================== */
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
