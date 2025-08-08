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
- Switched to Vite + Netlify functions:serve architecture
- Added concurrently to run both servers simultaneously
- Added Vite proxy to forward /api/admin/create-user to functions server
- Removed edge-functions folder completely
- **Status:** Complete - Pure Node Functions mode with Vite proxy  
- **Next:** Run npm run dev:local and verify both servers start

### STEP Dev-Local-01 — Vite+Functions mode ✅
- Fixed Vite proxy to point to /.netlify/functions/admin-create-user
- Removed admin secret requirement for localhost dev
- Simplified adminSignup.ts for local development
- **Status:** Ready for local development testing
- **Next:** Test with npm run dev:local

### STEP Function-02 — Curl test ⏳
- **Next:** Test function with curl to localhost:9999

### STEP UI-03 — Signup via UI ⏳
- **Next:** Test signup form via Vite proxy

### STEP UI-07 — Ensure client uses the admin route ⏳
- **Next:** Verify UI calls admin route and handles responses  

### STEP ENV-08 — Production URLs and allowlist ⏳
- **Next:** Configure production URLs in environment and Supabase

---
*Last updated: Dependencies stabilized, ready for dev server*