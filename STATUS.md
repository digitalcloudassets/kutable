# Netlify Functions Signup Setup Status

## Progress Tracking

### STEP E-01 — Disable Edge Functions in dev ✅
- Updated package.json dev:netlify script to add NETLIFY_DEV_DISABLE_EDGE_HANDLERS=1
- Added --forceLocal and --framework="#static" for hardened Edge disabling
- Verified netlify.toml has no [edge_functions] block (only Node functions)
- **Status:** Complete

### STEP T-02 — Stabilize Netlify CLI + sub-deps ✅  
- Pinned netlify-cli@17.34.3 and decache@4.6.1 in devDependencies
- Added overrides for update-notifier@7.3.1, ci-info@3.9.0, decache@4.6.1
- Clean installed dependencies with pnpm --shamefully-hoist
- **Status:** Complete

### STEP C-03 — PostCSS sanity ✅
- Verified postcss.config.cjs exists and is properly configured
- PostCSS, autoprefixer, and tailwindcss dependencies confirmed
- **Status:** Complete

### STEP F-04 — Ensure function exists and returns JSON ✅
- Verified netlify/functions/admin-create-user.ts exists and uses proper JSON responses
- Function uses Supabase service role for user creation
- CORS headers and error handling properly implemented
- netlify.toml redirect from /api/admin/create-user confirmed
- **Status:** Complete

### STEP D-05 — Start Netlify dev ⏳
- Updated script to disable Edge Functions with multiple env vars and --framework=#static
- Created and disabled edge-functions folder by renaming to _edge-functions_disabled
- Cleaned and reinstalled dependencies with hoisting
- Simplified dev script to use --offline flag only
- Added netlify-cli as dev dependency
- **Status:** Complete - Edge Functions hard-disabled with netlify-cli installed
- **Next:** Start dev server and verify Node-only operation

### STEP X-06 — Curl test the function ⏳
- **Next:** Test function endpoint with curl

### STEP UI-07 — Ensure client uses the admin route ⏳
- **Next:** Verify UI calls admin route and handles responses  

### STEP ENV-08 — Production URLs and allowlist ⏳
- **Next:** Configure production URLs in environment and Supabase

---
*Last updated: Dependencies stabilized, ready for dev server*