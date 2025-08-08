# Netlify Functions Signup Setup Status

## Progress Tracking

### STEP E-01 — Disable Edge Functions in dev ✅
- Updated package.json dev:netlify script to add NETLIFY_DEV_DISABLE_EDGE_HANDLERS=1
- Verified netlify.toml has no [edge_functions] block (only Node functions)
- **Next:** STEP T-02 - Stabilize Netlify CLI + sub-deps

### STEP T-02 — Stabilize Netlify CLI + sub-deps ⏳
- Adding netlify-cli@17.34.3 and decache@4.6.1 to devDependencies
- Forcing overrides for update-notifier@7.3.1, ci-info@3.9.0, decache@4.6.1
- **Next:** Clean install dependencies

### STEP C-03 — PostCSS sanity ⏳
- **Next:** Verify PostCSS configuration if needed

### STEP F-04 — Ensure function exists and returns JSON ⏳
- **Next:** Verify admin-create-user function exists and is properly configured

### STEP D-05 — Start Netlify dev ⏳
- **Next:** Start dev server and verify it runs without errors

### STEP X-06 — Curl test the function ⏳
- **Next:** Test function endpoint with curl

### STEP UI-07 — Ensure client uses the admin route ⏳
- **Next:** Verify UI calls admin route and handles responses

### STEP ENV-08 — Production URLs and allowlist ⏳
- **Next:** Configure production URLs in environment and Supabase

---
*Last updated: Starting setup process*