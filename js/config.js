/*
 * GrowTogether — Back4App Client Configuration
 * ─────────────────────────────────────────────
 * NOTE ON KEY SECURITY:
 *   The Back4App JavaScript Key is intentionally used client-side — it is a
 *   *public* key designed for browser use, not a secret server key.
 *   Security is enforced at the database level via Class-Level Permissions (CLPs).
 *
 *   REQUIRED BACK4APP CLP SETUP (Dashboard → Database → [Class] → Security):
 *   ┌──────────────────────┬────────────┬──────────────────────────────────────┐
 *   │ Class                │ Public     │ Note                                 │
 *   ├──────────────────────┼────────────┼──────────────────────────────────────┤
 *   │ Enquiry              │ Create ✓   │ Anyone can submit; only auth can read │
 *   │                      │ Find   ✗   │                                      │
 *   │                      │ Get    ✗   │                                      │
 *   ├──────────────────────┼────────────┼──────────────────────────────────────┤
 *   │ SiteSettings         │ Find   ✓   │ Public read OK (badge text etc.)     │
 *   │                      │ Create ✗   │ Only admin writes                    │
 *   └──────────────────────┴────────────┴──────────────────────────────────────┘
 *
 *   Admin writes go through Parse.User session (admin.html uses Parse.User.logIn).
 *   Never use the Master Key in client-side code.
 */

const BACK4APP_CONFIG = {
  APP_ID: 'PXH1eRCLDbQtVgFUPJ4SMeCTJCWdYlGxNJEPLbCF',
  JS_KEY: 'pekDMDyUG8Fpn7E4ty2mYtypRfQzlHHVXlpRQvUF',
  SERVER_URL: 'https://parseapi.back4app.com'
};

/* Site-wide constants used across pages */
const SITE_CONFIG = {
  name: 'GrowTogether',
  url: 'https://growtogether.in',
  whatsapp: '+919876543210',   // ← update via admin Settings panel
  email: 'hello@growtogether.in',
  tagline: 'Land. Farmers. Your Harvest.',
};
