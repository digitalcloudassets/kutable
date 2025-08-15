// Shared security headers for JSON responses from Edge Functions.
// CSP mainly protects HTML documents, so we focus on safe defaults here.
export const securityHeaders: Record<string, string> = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  // Prevent embedding your function responses in other sites
  "X-Frame-Options": "DENY",
};

// Helper to merge your existing headers (like CORS) with security defaults
export function withSecurityHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  return { ...securityHeaders, ...headers };
}