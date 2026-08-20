/* =========================================================
   GCTBM Lessons — site settings.

   This is the one file you can safely edit by hand. Change a value
   between the quote marks, save, then commit/push — the site rebuilds
   itself within about a minute.
   ========================================================= */

window.GCTBM_CONFIG = {
  /* -------------------------------------------------------
     WHERE THE "GO TO PAYMENT" BUTTON SENDS PEOPLE

     After someone books, the last screen shows a "Go to Payment"
     button. This is the address it opens. Keep the quote marks and
     the https:// prefix.
     ------------------------------------------------------- */
  PAYMENT_URL: "https://www.gctbm.nl/lessons-register.php",

  /* -------------------------------------------------------
     DATABASE CONNECTION — do not change these two.

     The key below is the public "anon" key and is meant to be
     visible. The database is protected by its own security rules,
     not by hiding this value.
     ------------------------------------------------------- */
  SUPABASE_URL: "https://apwdspqqgnxyvpcicfdp.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_-afSdJI7imtYCJIHhEgQoA_cy61cIMZ",
};
