// Single source of truth for "I'm in Bolt/Stack preview and dev preview mode is ON"
export function isPreviewHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname || "";
  return h.includes("webcontainer-api.io") || h.includes("stackblitz") || h.includes("codesandbox");
}

export function devPreviewEnabled() {
  return isPreviewHost() && (import.meta.env.VITE_DEV_PREVIEW_MODE === "true");
}

// Dev preview bypass for connection checks
export function shouldBypassConnectionChecks() {
  return devPreviewEnabled();
}

// Dev preview bypass for function calls
export function shouldBypassFunctionCalls() {
  return devPreviewEnabled();
}

// Dev preview bypass for admin guards (only in preview, not prod)
export function shouldBypassAdminGuards() {
  return devPreviewEnabled();
}

// Check if we're in a development environment
export function isDevelopmentMode() {
  return import.meta.env.DEV;
}

// Check if we're in a production environment
export function isProductionMode() {
  return !import.meta.env.DEV;
}