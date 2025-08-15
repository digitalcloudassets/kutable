// Frontend logger: verbose in dev, quiet in prod (warn/error only).
type Level = "debug" | "info" | "warn" | "error";

const isDev = import.meta.env.DEV === true;

function mkPrefix(level: Level) {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}]`;
}

function noop(..._args: any[]) {}

export const logger = {
  debug: isDev ? (...args: any[]) => console.debug(mkPrefix("debug"), ...args) : noop,
  info:  isDev ? (...args: any[]) => console.info(mkPrefix("info"), ...args)  : noop,
  warn:  (...args: any[]) => console.warn(mkPrefix("warn"), ...args),
  error: (...args: any[]) => console.error(mkPrefix("error"), ...args),

  /**
   * Quick timing helper:
   * const stop = logger.time('fetchServices'); ... stop();
   */
  time(label: string) {
    const start = performance.now();
    return () => {
      const ms = Math.round(performance.now() - start);
      (isDev ? console.info : console.warn)(mkPrefix("info"), `${label} ${ms}ms`);
    };
  },
};