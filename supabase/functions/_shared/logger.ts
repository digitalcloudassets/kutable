// Server logger for Edge Functions: configurable via LOG_LEVEL.
// LOG_LEVEL can be one of: debug, info, warn, error
type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const envLevel = (Deno.env.get("LOG_LEVEL") ?? "info").toLowerCase() as Level;
const threshold = ORDER[envLevel] ?? ORDER.info;

function should(level: Level) {
  return ORDER[level] >= threshold;
}

function prefix(level: Level) {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}]`;
}

export const slog = {
  debug: (...args: any[]) => { if (should("debug")) console.debug(prefix("debug"), ...args); },
  info:  (...args: any[]) => { if (should("info"))  console.info(prefix("info"),  ...args); },
  warn:  (...args: any[]) => { if (should("warn"))  console.warn(prefix("warn"),  ...args); },
  error: (...args: any[]) => { if (should("error")) console.error(prefix("error"), ...args); },
};