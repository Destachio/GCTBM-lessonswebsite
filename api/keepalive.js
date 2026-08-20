/**
 * Keep-alive ping for the Supabase free tier.
 *
 * Supabase pauses a free-tier project after ~7 days with no database activity.
 * A paused project stops resolving entirely, which takes the whole booking site
 * down until someone restores it by hand.
 *
 * Vercel calls this endpoint on a daily cron (see "crons" in vercel.json). All it
 * does is run the cheapest possible read against the database, which resets the
 * inactivity timer.
 *
 * The key below is the public anon/publishable key — the same one already shipped
 * in config.js and safe to expose. Row-level security is what protects the data.
 */

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://apwdspqqgnxyvpcicfdp.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || "sb_publishable_-afSdJI7imtYCJIHhEgQoA_cy61cIMZ";

module.exports = async function handler(req, res) {
  const startedAt = Date.now();

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/locations?select=id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      return res.status(502).json({
        ok: false,
        reason: "supabase-error",
        status: response.status,
        detail: body.slice(0, 200),
        ms: Date.now() - startedAt,
      });
    }

    const rows = await response.json();
    return res.status(200).json({
      ok: true,
      rows: Array.isArray(rows) ? rows.length : 0,
      ms: Date.now() - startedAt,
      at: new Date().toISOString(),
    });
  } catch (err) {
    // Most likely the project is already paused (DNS stops resolving) or timed out.
    return res.status(503).json({
      ok: false,
      reason: "unreachable",
      detail: String(err && err.message ? err.message : err).slice(0, 200),
      ms: Date.now() - startedAt,
    });
  }
};
