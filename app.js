/* =========================================================
   GCTBM Lessons — Golf Lesson Booking Application
   React app talking to Supabase for all data.
   ========================================================= */

const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ============================== SUPABASE CLIENT ============================== */
const CONFIG = window.GCTBM_CONFIG || {};
const SUPABASE_READY =
  CONFIG.SUPABASE_URL &&
  CONFIG.SUPABASE_ANON_KEY &&
  !CONFIG.SUPABASE_URL.includes("REPLACE_WITH") &&
  !CONFIG.SUPABASE_ANON_KEY.includes("REPLACE_WITH");

const SB = SUPABASE_READY
  ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

/* ------------------------------- Mappers -------------------------------- */
const toUiSeason   = (r) => ({ id: r.id, name: r.name, startDate: r.start_date, price: Number(r.price), isCurrent: !!r.is_current });
const toDbSeason   = (s) => ({ id: s.id, name: s.name, start_date: s.startDate, price: s.price, is_current: !!s.isCurrent });
const toUiLocation = (r) => ({ id: r.id, name: r.name, address: r.address, coach: r.coach });
const toDbLocation = (l) => ({ id: l.id, name: l.name, address: l.address, coach: l.coach });
const toUiTimeslot = (r) => ({
  id: r.id, season: r.season_id, location: r.location_id,
  day: r.day_of_week, time: r.time_block, level: r.level,
  maxTrainees: r.max_trainees,
  lessonDates: Array.isArray(r.lesson_dates) ? r.lesson_dates.map(d => typeof d === "string" ? d.slice(0,10) : d) : [],
  cancelledDates: Array.isArray(r.cancelled_dates) ? r.cancelled_dates.map(d => typeof d === "string" ? d.slice(0,10) : d) : [],
});
const toDbTimeslot = (t) => ({
  id: t.id, season_id: t.season, location_id: t.location,
  day_of_week: t.day, time_block: t.time, level: t.level,
  max_trainees: t.maxTrainees, lesson_dates: t.lessonDates,
  cancelled_dates: t.cancelledDates || [],
});
const toUiBooking = (r) => ({
  id: r.id, timeslotId: r.timeslot_id, name: r.full_name,
  email: r.email, phone: r.phone, status: r.status,
  bookedAt: r.booked_at, attendance: r.attendance || {},
});

/* -------------------------------- API ----------------------------------- */
const db = {
  async loadReferenceData() {
    const [s, l, t] = await Promise.all([
      SB.from("seasons").select("*").order("start_date", { ascending: true }),
      SB.from("locations").select("*").order("name", { ascending: true }),
      SB.from("timeslots").select("*"),
    ]);
    if (s.error) throw s.error;
    if (l.error) throw l.error;
    if (t.error) throw t.error;
    return {
      seasons: (s.data || []).map(toUiSeason),
      locations: (l.data || []).map(toUiLocation),
      timeslots: (t.data || []).map(toUiTimeslot),
    };
  },

  async loadAvailability(seasonId) {
    const { data, error } = await SB.rpc("get_timeslot_availability", { p_season_id: seasonId });
    if (error) throw error;
    const map = {};
    (data || []).forEach((r) => { map[r.timeslot_id] = { booked: r.booked_count, waitlist: r.waitlist_count }; });
    return map;
  },

  async findExisting(email, phone, name) {
    const { data, error } = await SB.rpc("find_existing_bookings", {
      p_email: email || null, p_phone: phone || null, p_name: name || null,
    });
    if (error) throw error;
    return (data || []).map((r) => ({
      id: r.id,
      timeslotId: r.timeslot_id,
      status: r.booking_status,
    }));
  },

  async createBooking({ timeslotId, name, email, phone, replaceIds = [] }) {
    const { data, error } = await SB.rpc("create_booking", {
      p_timeslot_id: timeslotId,
      p_full_name: name,
      p_email: email,
      p_phone: phone,
      p_replace_ids: replaceIds,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { id: row.booking_id, status: row.booking_status };
  },

  async getMyBookings(email) {
    const { data, error } = await SB.rpc("get_my_bookings", { p_email: email });
    if (error) throw error;
    return (data || []).map((r) => ({
      id: r.id,
      timeslotId: r.timeslot_id,
      status: r.booking_status,
      attendance: r.attendance || {},
    }));
  },

  async toggleAttendance(email, bookingId, date) {
    const { data, error } = await SB.rpc("toggle_attendance", {
      p_email: email, p_booking_id: bookingId, p_date: date,
    });
    if (error) throw error;
    return data || {};
  },

  /* ---- Auth ---- */
  async signIn(email, password) {
    const { data, error } = await SB.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signOut() { await SB.auth.signOut(); },
  async getSession() {
    const { data } = await SB.auth.getSession();
    return data?.session || null;
  },
  onAuthChange(cb) { return SB.auth.onAuthStateChange((_e, session) => cb(session)); },

  /* ---- Admin direct CRUD (requires auth) ---- */
  async listAllBookings() {
    const { data, error } = await SB.from("bookings").select("*").order("booked_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(toUiBooking);
  },
  async upsertTimeslot(t) {
    const { error } = await SB.from("timeslots").upsert(toDbTimeslot(t));
    if (error) throw error;
  },
  async deleteTimeslot(id) {
    const { error } = await SB.from("timeslots").delete().eq("id", id);
    if (error) throw error;
  },
  async upsertSeason(s) {
    const { error } = await SB.from("seasons").upsert(toDbSeason(s));
    if (error) throw error;
  },
  async deleteSeason(id) {
    const { error } = await SB.from("seasons").delete().eq("id", id);
    if (error) throw error;
  },
  async setCurrentSeason(id) {
    const e1 = await SB.from("seasons").update({ is_current: false }).neq("id", "__none__");
    if (e1.error) throw e1.error;
    const e2 = await SB.from("seasons").update({ is_current: true }).eq("id", id);
    if (e2.error) throw e2.error;
  },
  async upsertLocation(l) {
    const { error } = await SB.from("locations").upsert(toDbLocation(l));
    if (error) throw error;
  },
  async deleteLocation(id) {
    const { error } = await SB.from("locations").delete().eq("id", id);
    if (error) throw error;
  },
  async deleteBooking(id) {
    const { error } = await SB.from("bookings").delete().eq("id", id);
    if (error) throw error;
  },
  async promoteBooking(id) {
    const { error } = await SB.from("bookings").update({ status: "booked" }).eq("id", id);
    if (error) throw error;
  },

  /* ---- Role + trainer features ---- */
  async getCurrentUserRole() {
    const { data, error } = await SB.rpc("current_user_role");
    if (error) throw error;
    return data || "anon";
  },
  async getCurrentTrainerLocation() {
    const { data, error } = await SB.rpc("current_trainer_location");
    if (error) throw error;
    return data || null;
  },
  async listTrainerProfiles() {
    const { data, error } = await SB.from("trainer_profiles").select("*");
    if (error) throw error;
    return data || [];
  },
  async addTrainerProfile({ userId, locationId, displayName }) {
    const { error } = await SB.from("trainer_profiles").insert({
      user_id: userId, location_id: locationId, display_name: displayName || null,
    });
    if (error) throw error;
  },
  async removeTrainerProfile(userId) {
    const { error } = await SB.from("trainer_profiles").delete().eq("user_id", userId);
    if (error) throw error;
  },
  async findUserIdByEmail(email) {
    const { data, error } = await SB.rpc("admin_find_user_by_email", { p_email: email });
    if (error) throw error;
    return data || null;
  },
  async trainerUpdateLessons(timeslotId, lessonDates, cancelledDates) {
    const { error } = await SB.rpc("trainer_update_lessons", {
      p_timeslot_id: timeslotId,
      p_lesson_dates: lessonDates,
      p_cancelled_dates: cancelledDates,
    });
    if (error) throw error;
  },
};

/* ---------------------------- Icons (inline SVG) --------------------------- */
const Icon = {
  // Pin → golf flag in cup (used for brand + locations)
  Pin: (p) => (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="3" x2="7" y2="20"/>
      <path d="M7 3 L18 6.5 L7 10 Z" fill="currentColor" stroke="none"/>
      <ellipse cx="12" cy="20" rx="7" ry="1.5"/>
    </svg>
  ),
  // Golf ball — used for Beginner level
  Ball: (p) => (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="9.5"  cy="9.5"  r="0.7" fill="currentColor" stroke="none"/>
      <circle cx="13"   cy="10"   r="0.7" fill="currentColor" stroke="none"/>
      <circle cx="10.5" cy="13"   r="0.7" fill="currentColor" stroke="none"/>
      <circle cx="14"   cy="14"   r="0.7" fill="currentColor" stroke="none"/>
      <circle cx="11"   cy="16"   r="0.7" fill="currentColor" stroke="none"/>
      <circle cx="8.5"  cy="14.5" r="0.7" fill="currentColor" stroke="none"/>
    </svg>
  ),
  // Crossed golf clubs — used for Intermediate level
  Club: (p) => (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6"  y1="4"  x2="16" y2="18"/>
      <line x1="18" y1="4"  x2="8"  y2="18"/>
      <path d="M14.5 18 L20 19.5 L18.5 22 L13 20.5 Z" fill="currentColor" stroke="none"/>
      <path d="M9.5 18 L4 19.5 L5.5 22 L11 20.5 Z" fill="currentColor" stroke="none"/>
    </svg>
  ),
  // Trophy — used for Advanced level
  Trophy: (p) => (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8"/>
      <path d="M12 17v4"/>
      <path d="M7 4h10v6a5 5 0 0 1-10 0V4z" fill="currentColor" stroke="currentColor" fillOpacity="0.15"/>
      <path d="M17 5h2a2 2 0 0 1 0 4h-2"/>
      <path d="M7 5H5a2 2 0 0 0 0 4h2"/>
    </svg>
  ),
  // Generic person silhouette (used for check-in icon, trainee form)
  User: (p) => (<svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  Users: (p) => (<svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
  Check: (p) => (<svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
  CheckBig: (p) => (<svg width={p.size||40} height={p.size||40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>),
  Calendar: (p) => (<svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
  Lock: (p) => (<svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  Clock: (p) => (<svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  ChevRight: (p) => (<svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>),
  ChevLeft: (p) => (<svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>),
  Eye: (p) => (<svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>),
  Download: (p) => (<svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>),
  Plus: (p) => (<svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  Edit: (p) => (<svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>),
  Trash: (p) => (<svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 0 1-2 1.84h-7a2 2 0 0 1-2-1.84L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>),
  Loader: (p) => (<svg width={p.size||24} height={p.size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>),
};

/* ----------------------------- Constants ------------------------------ */
const LEVELS = [
  { id: "beginner",     name: "Beginner",     desc: "For those completely new to the sport. Handicap 54 preparation.",      icon: "Ball"   },
  { id: "intermediate", name: "Intermediate", desc: "Improving swing mechanics and course management. Handicap 36-54.",     icon: "Club"   },
  { id: "advanced",     name: "Advanced",     desc: "Competitive play strategies and fine-tuning. Handicap < 36.",          icon: "Trophy" },
];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_PLURAL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const TIME_BLOCKS = ["17:00-18:00", "18:00-19:00", "19:00-20:00"];

/* ----------------------------- Util ---------------------------------- */
const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const formatShortDate = (iso) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};
const cap = (s) => (s || "").charAt(0).toUpperCase() + (s || "").slice(1);
const todayISO = () => new Date().toISOString().slice(0, 10);

function defaultWeeksFromDate(dateStr, dayOfWeek) {
  const start = new Date(dateStr);
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

function buildICS({ summary, location, description, dates, time }) {
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
  const [data, setData] = useState(null);           // null = loading
  const [loadError, setLoadError] = useState(null);
  const [session, setSession] = useState(null);
  const [view, setView] = useState({ name: "booking", step: 1 });
  const [draft, setDraft] = useState({ level: null, location: null, timeslotId: null, name: "", email: "", phone: "" });
  const [currentSeasonId, setCurrentSeasonId] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const ref = await db.loadReferenceData();
      let csId = currentSeasonId;
      if (!csId) {
        csId = (ref.seasons.find(s => s.isCurrent) || ref.seasons[0])?.id;
        setCurrentSeasonId(csId);
      }
      const avail = csId ? await db.loadAvailability(csId) : {};
      setData({ ...ref, availability: avail });
      setLoadError(null);
    } catch (e) {
      console.error(e);
      setLoadError(e.message || String(e));
    }
  }, [currentSeasonId]);

  useEffect(() => {
    if (!SUPABASE_READY) {
      setLoadError("Supabase is not configured. Edit config.js with your project URL and anon key.");
      return;
    }
    refresh();
    db.getSession().then(setSession);
    const { data: sub } = db.onAuthChange(setSession);
    return () => { sub?.subscription?.unsubscribe?.(); };
    // eslint-disable-next-line
  }, []);

  // When season changes, reload availability
  useEffect(() => {
    if (!data || !currentSeasonId) return;
    let cancelled = false;
    db.loadAvailability(currentSeasonId).then((avail) => {
      if (!cancelled) setData((d) => d ? { ...d, availability: avail } : d);
    }).catch((e) => console.error(e));
    return () => { cancelled = true; };
  }, [currentSeasonId]);

  const seasonsMap = useMemo(() => {
    if (!data) return {};
    const m = {};
    data.seasons.forEach((s) => { m[s.id] = s; });
    return m;
  }, [data]);
  const locationsMap = useMemo(() => {
    if (!data) return {};
    const m = {};
    data.locations.forEach((l) => { m[l.id] = l; });
    return m;
  }, [data]);

  if (loadError) {
    return (
      <div className="app-shell">
        <div className="glass-card" style={{textAlign: "center"}}>
          <h2 className="title" style={{color: "var(--red-500)"}}>Could not load data</h2>
          <p className="muted">{loadError}</p>
          <button className="primary-btn" onClick={() => { setLoadError(null); refresh(); }}>Try again</button>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="app-shell">
        <div className="glass-card" style={{textAlign: "center", padding: 60}}>
          <div className="spinner"><Icon.Loader size={28} /></div>
          <p className="muted" style={{marginTop: 12}}>Loading…</p>
        </div>
      </div>
    );
  }

  const state = {
    currentSeason: currentSeasonId,
    seasons: seasonsMap,
    locations: locationsMap,
    timeslots: data.timeslots,
    availability: data.availability,
  };

  const goto = (name, extra = {}) => setView({ name, ...extra });

  return (
    <div className="app-shell">
      <Header
        seasonName={seasonsMap[currentSeasonId]?.name}
        view={view}
        onNav={goto}
        onSeasonChange={setCurrentSeasonId}
        seasons={state.seasons}
        session={session}
        onSignOut={async () => { await db.signOut(); setSession(null); }}
      />

      {view.name === "booking" && (
        <BookingFlow
          state={state}
          refresh={refresh}
          draft={draft}
          setDraft={setDraft}
          view={view}
          setView={setView}
        />
      )}
      {view.name === "calendar" && <CalendarView state={state} />}
      {view.name === "admin" && (
        <AdminPanel state={state} refresh={refresh} session={session} setSession={setSession} />
      )}
      {view.name === "checkin" && <CheckinPortal state={state} />}
    </div>
  );
}

/* ============================== HEADER ============================== */
function Header({ seasonName, view, onNav, onSeasonChange, seasons, session, onSignOut }) {
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
          <button className={`icon-btn ${view.name === "admin" ? "active" : ""}`} title={session ? "Admin (signed in)" : "Admin"} onClick={() => onNav("admin")}>
            <Icon.Lock />
            {session && <span style={{position: "absolute", marginTop: -22, marginLeft: 18, width: 8, height: 8, borderRadius: 4, background: "#10B981"}} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================== BOOKING FLOW ============================== */
function BookingFlow({ state, refresh, draft, setDraft, view, setView }) {
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
        <Step3Timeslot state={state} draft={draft} onPick={(timeslotId) => goToStep(4, { timeslotId })} />
      )}
      {step === 4 && (
        <Step4Confirm
          state={state}
          refresh={refresh}
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

function Step3Timeslot({ state, draft, onPick }) {
  const [scheduleFor, setScheduleFor] = useState(null);
  const slots = state.timeslots.filter(
    (t) => t.season === state.currentSeason && t.location === draft.location && t.level === draft.level
  );
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
            const avail = state.availability[ts.id] || { booked: 0, waitlist: 0 };
            const left = ts.maxTrainees - avail.booked;
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

function Step4Confirm({ state, refresh, draft, setDraft, onComplete }) {
  const ts = state.timeslots.find((t) => t.id === draft.timeslotId);
  const loc = state.locations[ts?.location];
  const season = state.seasons[state.currentSeason];
  const avail = state.availability[ts?.id] || { booked: 0 };
  const isWaitlist = avail.booked >= (ts?.maxTrainees || 0);

  const ready = draft.name.trim() && draft.email.trim() && draft.phone.trim();
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const submitBooking = async (replaceIds = []) => {
    setSubmitting(true);
    setErrMsg(null);
    try {
      const result = await db.createBooking({
        timeslotId: ts.id,
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        replaceIds,
      });
      setDraft((d) => ({ ...d, bookingId: result.id }));
      await refresh(); // refresh availability counts
      onComplete(result.id, result.status === "waitlist");
    } catch (e) {
      console.error(e);
      setErrMsg(e.message || "Could not save your booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ready || submitting) return;
    setSubmitting(true);
    setErrMsg(null);
    try {
      const existing = await db.findExisting(draft.email.trim(), draft.phone.trim(), draft.name.trim());
      if (existing.length > 0) {
        setDuplicateWarning({ existing });
        setSubmitting(false);
        return;
      }
      await submitBooking([]);
    } catch (e) {
      console.error(e);
      setErrMsg(e.message || "Could not check availability. Please try again.");
      setSubmitting(false);
    }
  };

  if (!ts) return null;

  return (
    <div className="glass-card">
      <h2 className="title">Confirm & Pay</h2>
      <p className="subtitle">Please review your course details.</p>

      <div className="confirm-table">
        <div className="confirm-row"><span className="lbl">Course</span><span className="val">{cap(ts.level)} Golf</span></div>
        <div className="confirm-row"><span className="lbl">Location</span><span className="val">{loc?.name}</span></div>
        <div className="confirm-row"><span className="lbl">Coach</span><span className="val">{loc?.coach}</span></div>
        <div className="confirm-row"><span className="lbl">Schedule</span><span className="val">{DAY_PLURAL[ts.day]} @ {ts.time}</span></div>
        <div className="confirm-row total"><span className="lbl">Total Price</span><span className="val">€{season?.price?.toFixed(2)}</span></div>
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
        {errMsg && <p style={{color: "var(--red-500)", fontSize: "0.85rem", marginTop: -4, marginBottom: 12}}>{errMsg}</p>}
        <button className="primary-btn" type="submit" disabled={!ready || submitting}>
          {submitting ? "Working…" : (isWaitlist ? "Join Waitlist" : "Proceed to Payment")}
        </button>
      </form>

      {duplicateWarning && (
        <DuplicateBookingModal
          existing={duplicateWarning.existing}
          state={state}
          onClose={() => setDuplicateWarning(null)}
          onChange={async () => {
            const ids = duplicateWarning.existing.map((b) => b.id);
            setDuplicateWarning(null);
            await submitBooking(ids);
          }}
          onCancelExisting={async () => {
            const ids = duplicateWarning.existing.map((b) => b.id);
            // Cancel via RPC: pass empty replace + then... actually we just need to mark them cancelled.
            // We do this by calling create_booking with the cancel IDs but no insert. Simpler: use direct cancel via RPC.
            // Quickest path: just submit nothing, set them cancelled by re-using create_booking won't work without insert.
            // Instead: ask admin path. For now, just leave bookings; user can contact admin. Cleaner: add a cancel RPC.
            try {
              // Use create_booking with replace_ids but insert into the same timeslot would create new one. Not what we want.
              // The simplest: do nothing here. To avoid orphaning trainees, just close modal with feedback.
              alert("To cancel an existing booking, please contact the golf school.");
              setDuplicateWarning(null);
            } catch (e) { setErrMsg(e.message); }
          }}
        />
      )}
    </div>
  );
}

function DuplicateBookingModal({ existing, state, onClose, onChange, onCancelExisting }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{color: "var(--amber-500)"}}>⚠ Existing Booking Found</h3>
        <p style={{margin: "0 0 16px", color: "var(--gray-700)", fontSize: "0.92rem"}}>
          We already have {existing.length === 1 ? "an active booking" : `${existing.length} active bookings`} matching your name, email, or phone number. To prevent double bookings, please review:
        </p>
        <div className="lesson-list" style={{marginBottom: 16}}>
          {existing.map((b) => {
            const ts = state.timeslots.find((t) => t.id === b.timeslotId);
            if (!ts) return null;
            const loc = state.locations[ts.location];
            return (
              <div key={b.id} className="lesson-row" style={{flexDirection: "column", alignItems: "flex-start", gap: 4}}>
                <div style={{display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center"}}>
                  <span className="lesson-week">{cap(ts.level)} Golf @ {loc?.name}</span>
                  <span className={`trainee-status ${b.status}`}>{b.status}</span>
                </div>
                <span className="lesson-date">{DAY_PLURAL[ts.day]} • {ts.time} • {loc?.coach}</span>
                <span className="lesson-date">Starts {formatShortDate(ts.lessonDates[0])} • {ts.lessonDates.length} lessons</span>
              </div>
            );
          })}
        </div>
        <p style={{margin: "0 0 16px", color: "var(--gray-700)", fontSize: "0.9rem", fontWeight: 600}}>What would you like to do?</p>
        <div style={{display: "flex", flexDirection: "column", gap: 10}}>
          <button className="primary-btn" onClick={onChange}>Change to this new booking</button>
          <button className="secondary-btn" onClick={onClose} style={{background: "transparent", border: "none", color: "var(--gray-500)"}}>
            Keep existing &mdash; don't book this one
          </button>
        </div>
      </div>
    </div>
  );
}

function Step5Success({ state, draft, isWaitlist, onReset }) {
  const ts = state.timeslots.find((t) => t.id === draft.timeslotId);
  const loc = state.locations[ts?.location];
  if (!ts || !loc) return null;
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
          {isWaitlist ? (
            <button className="primary-btn" onClick={onReset}>Done →</button>
          ) : (
            <a
              className="primary-btn"
              href="https://www.gctbm.nl/lessons-register.php"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { setTimeout(onReset, 100); }}
              style={{textDecoration: "none", display: "block", textAlign: "center"}}
            >
              Go to Payment →
            </a>
          )}
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
  const startDate = season ? new Date(season.startDate) : new Date();
  const [month, setMonth] = useState(new Date(startDate.getFullYear(), startDate.getMonth(), 1));

  const lessonsByDate = useMemo(() => {
    const map = {};
    state.timeslots
      .filter((ts) => ts.season === state.currentSeason)
      .forEach((ts) => {
        ts.lessonDates.forEach((d) => {
          const key = typeof d === "string" ? d.slice(0,10) : d;
          if (!map[key]) map[key] = [];
          map[key].push(ts);
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
  const seasonSlotCount = state.timeslots.filter(t => t.season === state.currentSeason).length;

  return (
    <div className="glass-card">
      <h2 className="title">Season Calendar</h2>
      <p className="subtitle">{season?.name} — {totalLessons} lessons across {seasonSlotCount} courses</p>

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
                  <span key={idx} className="cal-lesson-chip" title={`${cap(ts.level)} • ${state.locations[ts.location]?.name} • ${ts.time}`}>
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
          .filter(([d]) => { const dt = new Date(d); return dt.getFullYear() === year && dt.getMonth() === m; })
          .sort()
          .slice(0, 10)
          .map(([d, slots]) => (
            <div key={d} className="lesson-row">
              <div className="lesson-info">
                <span className="lesson-week">{formatShortDate(d)}</span>
                <span className="lesson-date">{slots.map((s) => `${cap(s.level)} • ${state.locations[s.location]?.name} • ${s.time}`).join(" / ")}</span>
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

/* ============================== STAFF (ADMIN or TRAINER) ============================== */
function AdminPanel({ state, refresh, session, setSession }) {
  const [role, setRole] = useState(null);
  const [trainerLoc, setTrainerLoc] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) { setRole(null); setTrainerLoc(null); return; }
    setBusy(true);
    Promise.all([db.getCurrentUserRole(), db.getCurrentTrainerLocation()])
      .then(([r, loc]) => { setRole(r); setTrainerLoc(loc); })
      .catch((e) => { console.error(e); setRole("admin"); })
      .finally(() => setBusy(false));
  }, [session]);

  if (!session) return <AdminLogin onSignedIn={setSession} />;
  if (busy || !role) return (
    <div className="glass-card" style={{textAlign: "center", padding: 60}}>
      <div className="spinner"><Icon.Loader size={28} /></div>
      <p className="muted" style={{marginTop: 12}}>Checking role…</p>
    </div>
  );

  if (role === "trainer") {
    return <TrainerConsole state={state} refresh={refresh} session={session} locationId={trainerLoc} />;
  }
  return <AdminConsole state={state} refresh={refresh} session={session} />;
}

function AdminLogin({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const res = await db.signIn(email.trim(), password);
      onSignedIn(res.session);
    } catch (e) { setErr(e.message || "Sign-in failed"); }
    setBusy(false);
  };
  return (
    <div className="glass-card">
      <h2 className="title">Staff Sign-In</h2>
      <p className="subtitle">Sign in to access your admin or trainer dashboard.</p>
      <form onSubmit={handleSubmit}>
        <input className="form-input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input className="form-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {err && <p style={{color: "var(--red-500)", fontSize: "0.85rem", marginBottom: 12}}>{err}</p>}
        <button className="primary-btn" type="submit" disabled={busy || !email.trim() || !password}>
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}

function AdminConsole({ state, refresh, session }) {
  const [tab, setTab] = useState("timeslots");
  return (
    <div className="glass-card">
      <h2 className="title">Admin Console</h2>
      <p className="subtitle">Signed in as <b>{session.user.email}</b>{" • "}
        <button className="text-btn" onClick={async () => { await db.signOut(); }}>Sign out</button>
      </p>
      <div className="admin-tabs">
        <button className={`admin-tab ${tab === "timeslots" ? "active" : ""}`} onClick={() => setTab("timeslots")}>Timeslots</button>
        <button className={`admin-tab ${tab === "trainees" ? "active" : ""}`} onClick={() => setTab("trainees")}>Trainees</button>
        <button className={`admin-tab ${tab === "seasons" ? "active" : ""}`} onClick={() => setTab("seasons")}>Seasons</button>
        <button className={`admin-tab ${tab === "locations" ? "active" : ""}`} onClick={() => setTab("locations")}>Locations</button>
        <button className={`admin-tab ${tab === "trainers" ? "active" : ""}`} onClick={() => setTab("trainers")}>Trainers</button>
      </div>
      {tab === "timeslots" && <AdminTimeslots state={state} refresh={refresh} />}
      {tab === "trainees" && <AdminTrainees state={state} refresh={refresh} />}
      {tab === "seasons" && <AdminSeasons state={state} refresh={refresh} />}
      {tab === "locations" && <AdminLocations state={state} refresh={refresh} />}
      {tab === "trainers" && <AdminTrainersAssignments state={state} />}
    </div>
  );
}

function AdminTrainersAssignments({ state }) {
  const [profiles, setProfiles] = useState(null);
  const [emailLookup, setEmailLookup] = useState({});  // userId -> email
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newLocation, setNewLocation] = useState(Object.keys(state.locations)[0] || "");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const ps = await db.listTrainerProfiles();
      setProfiles(ps);
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const uid = await db.findUserIdByEmail(newEmail.trim());
      if (!uid) {
        setErr(`No Supabase user found with email "${newEmail}". Create the user first in Supabase → Authentication → Users.`);
        setBusy(false);
        return;
      }
      await db.addTrainerProfile({ userId: uid, locationId: newLocation, displayName: newDisplayName.trim() || null });
      setEmailLookup((m) => ({ ...m, [uid]: newEmail.trim() }));
      setAdding(false);
      setNewEmail(""); setNewDisplayName("");
      await load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const handleRemove = async (userId) => {
    if (!confirm("Remove trainer assignment? Their auth user stays — only their location access is revoked.")) return;
    try { await db.removeTrainerProfile(userId); await load(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="admin-section-head">
        <div>
          <h3 className="admin-section-title">Trainer Assignments</h3>
          <p className="muted" style={{margin: 0, fontSize: "0.85rem"}}>
            Each trainer needs a Supabase Auth user. After creating it in <b>Supabase → Authentication → Users</b>, assign their email to a location here.
          </p>
        </div>
        <button className="add-btn" onClick={() => setAdding(true)}><Icon.Plus /> Assign trainer</button>
      </div>

      {!profiles && <p className="muted center">Loading…</p>}
      {profiles && profiles.length === 0 && (
        <p className="muted center" style={{padding: "16px 0"}}>No trainers assigned yet.</p>
      )}
      {profiles && profiles.length > 0 && (
        <table className="admin-table">
          <thead><tr><th>Display name</th><th>Location</th><th>User ID</th><th></th></tr></thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.user_id}>
                <td><b>{p.display_name || <span className="muted">(not set)</span>}</b></td>
                <td>{state.locations[p.location_id]?.name || p.location_id}</td>
                <td><code style={{fontSize: "0.75rem", color: "var(--gray-500)"}}>{p.user_id.slice(0, 8)}…</code></td>
                <td>
                  <button className="row-action danger" onClick={() => handleRemove(p.user_id)}><Icon.Trash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Trainer</h3>
            <p className="muted" style={{fontSize: "0.88rem", marginTop: 0}}>
              The trainer must already exist as a Supabase Auth user.
            </p>
            <form onSubmit={handleAdd}>
              <label className="field-label">Trainer email</label>
              <input className="form-input" type="email" placeholder="trainer@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoFocus />
              <label className="field-label">Location</label>
              <select className="form-select" value={newLocation} onChange={(e) => setNewLocation(e.target.value)}>
                {Object.values(state.locations).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <label className="field-label">Display name (optional)</label>
              <input className="form-input" placeholder="Coach Marco" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} />
              {err && <p style={{color: "var(--red-500)", fontSize: "0.85rem"}}>{err}</p>}
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setAdding(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={busy || !newEmail.trim() || !newLocation}>
                  {busy ? "Assigning…" : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== TRAINER CONSOLE ============================== */
function TrainerConsole({ state, refresh, session, locationId }) {
  const location = state.locations[locationId];
  const [tab, setTab] = useState("schedule");
  const slots = state.timeslots
    .filter((t) => t.season === state.currentSeason && t.location === locationId)
    .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));

  if (!location) {
    return (
      <div className="glass-card">
        <h2 className="title">Trainer Dashboard</h2>
        <p className="muted center">Your trainer profile isn't linked to a location. Please ask your admin to assign you.</p>
        <button className="secondary-btn" onClick={async () => { await db.signOut(); }} style={{marginTop: 16}}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <h2 className="title">Trainer Dashboard</h2>
      <p className="subtitle">
        <b>{location.name}</b> • Signed in as <b>{session.user.email}</b>{" • "}
        <button className="text-btn" onClick={async () => { await db.signOut(); }}>Sign out</button>
      </p>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === "schedule" ? "active" : ""}`} onClick={() => setTab("schedule")}>Lesson Schedule</button>
        <button className={`admin-tab ${tab === "roster" ? "active" : ""}`} onClick={() => setTab("roster")}>Trainee Roster</button>
      </div>

      {tab === "schedule" && (
        <TrainerSchedule slots={slots} state={state} location={location} refresh={refresh} />
      )}
      {tab === "roster" && (
        <TrainerRoster slots={slots} state={state} />
      )}
    </div>
  );
}

function TrainerSchedule({ slots, state, location, refresh }) {
  const [selectedId, setSelectedId] = useState(slots[0]?.id || null);
  const ts = slots.find((t) => t.id === selectedId);

  return (
    <div>
      <label className="field-label">Choose a timeslot</label>
      <select className="form-select" value={selectedId || ""} onChange={(e) => setSelectedId(e.target.value)}>
        {slots.length === 0 && <option value="">No timeslots at this location</option>}
        {slots.map((t) => (
          <option key={t.id} value={t.id}>
            {DAY_NAMES[t.day]} • {t.time} • {cap(t.level)}
          </option>
        ))}
      </select>

      <div className="divider-thin" />

      {ts && <TrainerLessonsEditor timeslot={ts} location={location} refresh={refresh} />}
      {!ts && <p className="muted center">No timeslots scheduled for {location.name} in this season.</p>}
    </div>
  );
}

function TrainerLessonsEditor({ timeslot, location, refresh }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [reschedule, setReschedule] = useState(null); // { date, newDate }

  const apply = async (newLessonDates, newCancelledDates) => {
    setBusy(true); setErr(null);
    try {
      await db.trainerUpdateLessons(timeslot.id, newLessonDates, newCancelledDates);
      await refresh();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const cancelLesson = async (date) => {
    if (!confirm(`Cancel the lesson on ${formatShortDate(date)}? Trainees will see it removed from their schedule.`)) return;
    const newLessonDates = timeslot.lessonDates.filter((d) => d !== date);
    const newCancelledDates = [...(timeslot.cancelledDates || []), date];
    await apply(newLessonDates, newCancelledDates);
  };

  const restoreCancelled = async (date) => {
    const newLessonDates = [...timeslot.lessonDates, date].sort();
    const newCancelledDates = (timeslot.cancelledDates || []).filter((d) => d !== date);
    await apply(newLessonDates, newCancelledDates);
  };

  const applyReschedule = async () => {
    if (!reschedule || !reschedule.newDate) return;
    const newLessonDates = timeslot.lessonDates
      .map((d) => (d === reschedule.date ? reschedule.newDate : d))
      .sort();
    await apply(newLessonDates, timeslot.cancelledDates || []);
    setReschedule(null);
  };

  const today = todayISO();

  return (
    <div>
      <div className="checkin-card" style={{textAlign: "left"}}>
        <h3 style={{margin: 0}}>{cap(timeslot.level)} Golf — {DAY_PLURAL[timeslot.day]} {timeslot.time}</h3>
        <p className="muted" style={{margin: "4px 0 0", fontSize: "0.88rem"}}>
          {location.name} • {location.coach} • {timeslot.lessonDates.length} active lesson{timeslot.lessonDates.length === 1 ? "" : "s"}
          {(timeslot.cancelledDates || []).length > 0 && ` • ${timeslot.cancelledDates.length} cancelled`}
        </p>
      </div>

      {err && <p style={{color: "var(--red-500)", fontSize: "0.85rem"}}>{err}</p>}

      <h4 style={{margin: "18px 0 8px"}}>Active lessons</h4>
      <div className="lesson-list">
        {timeslot.lessonDates.length === 0 && (
          <p className="muted center" style={{padding: 12}}>No active lessons.</p>
        )}
        {timeslot.lessonDates.map((d, i) => {
          const past = d < today;
          return (
            <div key={d} className="lesson-row">
              <div className="lesson-info">
                <span className="lesson-week">Lesson {i + 1}{past ? " (past)" : ""}</span>
                <span className="lesson-date">{formatShortDate(d)}</span>
              </div>
              <div style={{display: "flex", gap: 6}}>
                <button className="row-action" disabled={busy || past} onClick={() => setReschedule({ date: d, newDate: d })}>Reschedule</button>
                <button className="row-action danger" disabled={busy || past} onClick={() => cancelLesson(d)}>Cancel</button>
              </div>
            </div>
          );
        })}
      </div>

      {(timeslot.cancelledDates || []).length > 0 && (
        <>
          <h4 style={{margin: "18px 0 8px"}}>Cancelled lessons</h4>
          <div className="lesson-list">
            {timeslot.cancelledDates.map((d) => (
              <div key={d} className="lesson-row" style={{opacity: 0.7}}>
                <div className="lesson-info">
                  <span className="lesson-week" style={{textDecoration: "line-through"}}>{formatShortDate(d)}</span>
                  <span className="lesson-date">Cancelled</span>
                </div>
                <button className="row-action" disabled={busy} onClick={() => restoreCancelled(d)}>Restore</button>
              </div>
            ))}
          </div>
        </>
      )}

      {reschedule && (
        <div className="modal-overlay" onClick={() => setReschedule(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reschedule lesson</h3>
            <p className="muted" style={{fontSize: "0.88rem", marginTop: 0}}>
              Original date: <b>{formatShortDate(reschedule.date)}</b>
            </p>
            <label className="field-label">New date</label>
            <input
              type="date"
              className="form-input"
              value={reschedule.newDate}
              min={today}
              onChange={(e) => setReschedule({ ...reschedule, newDate: e.target.value })}
            />
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setReschedule(null)}>Cancel</button>
              <button className="primary-btn" disabled={busy || !reschedule.newDate || reschedule.newDate === reschedule.date} onClick={applyReschedule}>
                {busy ? "Saving…" : "Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrainerRoster({ slots, state }) {
  const [selectedId, setSelectedId] = useState(slots[0]?.id || null);
  const [bookings, setBookings] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) { setBookings([]); return; }
    setLoading(true);
    db.listAllBookings()
      .then((all) => setBookings(all.filter((b) => b.timeslotId === selectedId)))
      .catch((e) => { console.error(e); setBookings([]); })
      .finally(() => setLoading(false));
  }, [selectedId]);

  const ts = slots.find((t) => t.id === selectedId);

  return (
    <div>
      <label className="field-label">Choose a timeslot</label>
      <select className="form-select" value={selectedId || ""} onChange={(e) => setSelectedId(e.target.value)}>
        {slots.length === 0 && <option value="">No timeslots at this location</option>}
        {slots.map((t) => (
          <option key={t.id} value={t.id}>
            {DAY_NAMES[t.day]} • {t.time} • {cap(t.level)}
          </option>
        ))}
      </select>

      <div className="divider-thin" />

      {!ts && <p className="muted center">No timeslot selected.</p>}
      {ts && loading && <p className="muted center">Loading roster…</p>}
      {ts && !loading && (
        <>
          <div className="attendance-summary">
            <div className="summary-stat"><div className="num">{(bookings || []).filter(b => b.status === "booked").length}/{ts.maxTrainees}</div><div className="lbl">Booked</div></div>
            <div className="summary-stat"><div className="num">{(bookings || []).filter(b => b.status === "waitlist").length}</div><div className="lbl">Waitlist</div></div>
            <div className="summary-stat"><div className="num">{ts.lessonDates.length}</div><div className="lbl">Lessons</div></div>
          </div>

          {bookings && bookings.length === 0 && <p className="muted center" style={{padding: 16}}>No bookings yet.</p>}
          {bookings && bookings.map((b) => {
            const attended = Object.values(b.attendance || {}).filter(Boolean).length;
            return (
              <div key={b.id} className="trainee-row">
                <div className="info">
                  <span className="trainee-name">{b.name}</span>
                  <span className="trainee-contact">{b.email} • {b.phone}</span>
                  <span className="trainee-contact">Attended {attended}/{ts.lessonDates.length} lessons</span>
                </div>
                <span className={`trainee-status ${b.status}`}>{b.status}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function AdminTimeslots({ state, refresh }) {
  const [editing, setEditing] = useState(null);
  const [locFilter, setLocFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const slots = state.timeslots
    .filter((t) => t.season === state.currentSeason)
    .filter((t) => locFilter === "all" || t.location === locFilter);

  const handleSave = async (ts) => {
    try { await db.upsertTimeslot(ts); await refresh(); setEditing(null); }
    catch (e) { alert(e.message); }
  };
  const handleDelete = async (id) => {
    if (!confirm("Delete this timeslot? Bookings on it will also be removed.")) return;
    setBusyId(id);
    try { await db.deleteTimeslot(id); await refresh(); } catch (e) { alert(e.message); }
    setBusyId(null);
  };

  return (
    <div>
      <div className="admin-section-head">
        <div>
          <h3 className="admin-section-title">Timeslot Schedule</h3>
          <p className="muted" style={{margin: 0, fontSize: "0.85rem"}}>{state.seasons[state.currentSeason]?.name}</p>
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
          })}><Icon.Plus /> Add</button>
        </div>
      </div>

      <div style={{overflowX: "auto"}}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Location</th><th>Day</th><th>Time</th><th>Level</th><th>Max</th><th>Booked</th><th>Lessons</th><th></th>
            </tr>
          </thead>
          <tbody>
            {slots.length === 0 && (
              <tr><td colSpan="8" className="center muted" style={{padding: 20}}>No timeslots configured. Click "Add" to start.</td></tr>
            )}
            {slots.map((t) => {
              const avail = state.availability[t.id] || { booked: 0, waitlist: 0 };
              return (
                <tr key={t.id}>
                  <td>{state.locations[t.location]?.name}</td>
                  <td>{DAY_NAMES[t.day]}</td>
                  <td>{t.time}</td>
                  <td>{cap(t.level)}</td>
                  <td>{t.maxTrainees}</td>
                  <td>{avail.booked}{avail.waitlist > 0 && <span className="muted"> (+{avail.waitlist} wait)</span>}</td>
                  <td>{t.lessonDates.length}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="row-action" onClick={() => setEditing(t)}><Icon.Edit /> Edit</button>
                      <button className="row-action danger" disabled={busyId === t.id} onClick={() => handleDelete(t.id)}><Icon.Trash /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <TimeslotEditor timeslot={editing} state={state} onSave={handleSave} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function TimeslotEditor({ timeslot, state, onSave, onClose }) {
  const [t, setT] = useState({ ...timeslot });
  const [saving, setSaving] = useState(false);
  const season = state.seasons[t.season];

  useEffect(() => {
    if (timeslot.isNew && season) {
      setT((cur) => ({ ...cur, lessonDates: defaultWeeksFromDate(season.startDate, cur.day) }));
    }
    // eslint-disable-next-line
  }, []);

  const regenDates = (day) => {
    setT((cur) => ({ ...cur, day, lessonDates: defaultWeeksFromDate(season.startDate, day) }));
  };
  const updateDate = (idx, newDate) => setT((cur) => {
    const next = [...cur.lessonDates]; next[idx] = newDate; return { ...cur, lessonDates: next };
  });
  const addLesson = () => {
    const last = t.lessonDates[t.lessonDates.length - 1];
    const d = last ? new Date(last) : new Date(season.startDate);
    d.setDate(d.getDate() + 7);
    setT((cur) => ({ ...cur, lessonDates: [...cur.lessonDates, d.toISOString().slice(0, 10)] }));
  };
  const removeLesson = (i) => setT((cur) => ({ ...cur, lessonDates: cur.lessonDates.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave({ ...t, isNew: undefined }); } finally { setSaving(false); }
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
          <button className="primary-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function AdminTrainees({ state, refresh }) {
  const slots = state.timeslots.filter((t) => t.season === state.currentSeason);
  const [selected, setSelected] = useState(slots[0]?.id || null);
  const [bookings, setBookings] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) { setBookings([]); return; }
    setLoading(true);
    db.listAllBookings()
      .then((all) => { setBookings(all.filter((b) => b.timeslotId === selected)); })
      .catch((e) => { console.error(e); setBookings([]); alert(e.message); })
      .finally(() => setLoading(false));
  }, [selected]);

  const ts = state.timeslots.find((t) => t.id === selected);

  const reload = async () => {
    const all = await db.listAllBookings();
    setBookings(all.filter((b) => b.timeslotId === selected));
    await refresh();
  };

  const removeBooking = async (id) => {
    if (!confirm("Remove this trainee from the timeslot?")) return;
    try { await db.deleteBooking(id); await reload(); } catch (e) { alert(e.message); }
  };
  const promote = async (id) => {
    try { await db.promoteBooking(id); await reload(); } catch (e) { alert(e.message); }
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
            <div className="summary-stat"><div className="num">{(bookings || []).filter((b) => b.status === "booked").length}/{ts.maxTrainees}</div><div className="lbl">Booked</div></div>
            <div className="summary-stat"><div className="num">{(bookings || []).filter((b) => b.status === "waitlist").length}</div><div className="lbl">Waitlist</div></div>
            <div className="summary-stat"><div className="num">{ts.lessonDates.length}</div><div className="lbl">Lessons</div></div>
          </div>

          {loading && <p className="muted center">Loading trainees…</p>}
          {!loading && bookings && bookings.length === 0 && <p className="muted center" style={{padding: "20px 0"}}>No bookings yet for this timeslot.</p>}

          {!loading && (bookings || []).map((b) => {
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

function AdminSeasons({ state, refresh }) {
  const [editing, setEditing] = useState(null);
  const handleSave = async (season) => {
    try { await db.upsertSeason(season); await refresh(); setEditing(null); } catch (e) { alert(e.message); }
  };
  const handleDelete = async (id) => {
    if (Object.keys(state.seasons).length <= 1) { alert("At least one season is required."); return; }
    if (!confirm("Delete this season? All timeslots in it will also be deleted.")) return;
    try { await db.deleteSeason(id); await refresh(); } catch (e) { alert(e.message); }
  };
  const setActive = async (id) => {
    try { await db.setCurrentSeason(id); await refresh(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="admin-section-head">
        <h3 className="admin-section-title">Seasons</h3>
        <button className="add-btn" onClick={() => setEditing({ id: "", name: "", startDate: new Date().toISOString().slice(0, 10), price: 350, isCurrent: false, isNew: true })}>
          <Icon.Plus /> Add
        </button>
      </div>
      <table className="admin-table">
        <thead><tr><th>Name</th><th>Starts</th><th>Price</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {Object.values(state.seasons).map((s) => (
            <tr key={s.id}>
              <td><b>{s.name}</b></td>
              <td>{formatShortDate(s.startDate)}</td>
              <td>€{s.price}</td>
              <td>{s.id === state.currentSeason ? <span className="trainee-status booked">Active</span> : <button className="row-action" onClick={() => setActive(s.id)}>Set Active</button>}</td>
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

function AdminLocations({ state, refresh }) {
  const [editing, setEditing] = useState(null);
  const handleSave = async (loc) => {
    try { await db.upsertLocation(loc); await refresh(); setEditing(null); } catch (e) { alert(e.message); }
  };
  const handleDelete = async (id) => {
    if (!confirm("Delete this location? Its timeslots will also be deleted.")) return;
    try { await db.deleteLocation(id); await refresh(); } catch (e) { alert(e.message); }
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
function CheckinPortal({ state }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const lookup = async () => {
    if (!email.trim()) return;
    setLoading(true); setErr(null);
    try {
      const list = await db.getMyBookings(email.trim());
      setMyBookings(list);
    } catch (e) { setErr(e.message); }
    setLoading(false);
    setSubmitted(true);
  };

  const toggle = async (bookingId, date) => {
    try {
      const updated = await db.toggleAttendance(email.trim(), bookingId, date);
      setMyBookings((arr) => arr.map((b) => b.id === bookingId ? { ...b, attendance: updated } : b));
    } catch (e) { alert(e.message); }
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
        onKeyDown={(e) => { if (e.key === "Enter") lookup(); }}
      />
      <button className="primary-btn" onClick={lookup} disabled={!email.trim() || loading}>
        {loading ? "Looking up…" : "Find My Lessons"}
      </button>

      {err && <p style={{color: "var(--red-500)", marginTop: 12}}>{err}</p>}

      {submitted && !loading && (
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
            const today = todayISO();
            return (
              <div key={b.id} className="checkin-card">
                <h3 style={{margin: "0 0 4px"}}>{cap(ts.level)} Golf @ {loc?.name}</h3>
                <p className="muted" style={{margin: 0}}>{DAY_PLURAL[ts.day]} • {ts.time} • {loc?.coach}</p>

                <div className="attendance-summary" style={{marginTop: 18}}>
                  <div className="summary-stat"><div className="num">{attended}</div><div className="lbl">Attended</div></div>
                  <div className="summary-stat"><div className="num">{total - attended}</div><div className="lbl">Remaining</div></div>
                  <div className="summary-stat"><div className="num">{Math.round((attended / total) * 100)}%</div><div className="lbl">Progress</div></div>
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
                          <button className={`check-toggle ${checked ? "on" : ""}`} onClick={() => toggle(b.id, d)}>
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
