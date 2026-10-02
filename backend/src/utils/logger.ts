import { pino, type Logger } from "pino";
import { IS_PRODUCTION, LOG_LEVEL } from "../config.js";

/**
 * Strips credentials out of anything on its way to a log line.
 *
 * `redact` only understands object paths, which is not where these leak.
 * TMDB and OMDb take their keys as query parameters, so any error mentioning
 * the URL it failed on carries the key in its *message* — node-fetch produces
 * exactly that: `request to https://api.themoviedb.org/...?api_key=abc failed`.
 * Those strings were going straight to stdout and, in production, to a log
 * drain.
 */
const SECRET_PATTERNS: [RegExp, string][] = [
  [/([?&](?:api_key|apikey|apiKey|key|token)=)[^&\s"']+/gi, "$1[redacted]"],
  [/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, "$1[redacted]"],
];

function scrubString(value: string): string {
  return SECRET_PATTERNS.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    value
  );
}

function scrub(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return scrubString(value);
  // Bounded, so a cyclic or pathological object cannot hang the logger.
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => scrub(item, depth + 1));
  if (value instanceof Error) return scrubString(value.message);

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = scrub(entry, depth + 1);
  }
  return output;
}

/**
 * Application logger.
 *
 * Phase 0 added structured logging for the Groq calls specifically, but
 * everything else was `console.log` with ad-hoc `[Prefix]` strings. That is
 * fine to read on a laptop and useless in production: Render's log drain
 * cannot filter, aggregate or alert on free text.
 *
 * Pino emits newline-delimited JSON, which those tools can index. In
 * development it is piped through pino-pretty so the local experience does
 * not regress.
 */
export const logger: Logger = pino({
  level: LOG_LEVEL,
  // The defaults are `hostname` and `pid`, which are noise on a single-process
  // PaaS deployment and just widen every line.
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  hooks: {
    // Runs on every log call, so a secret cannot reach a transport whichever
    // argument shape the caller used.
    logMethod(args, method) {
      return method.apply(this, args.map((arg) => scrub(arg)) as typeof args);
    },
  },
  redact: {
    // Belt and braces alongside `scrub`: this catches whole fields by name,
    // scrub catches secrets embedded inside strings.
    paths: [
      "req.headers.authorization",
      "req.headers['x-api-key']",
      "*.api_key",
      "*.apiKey",
      "*.password",
      "*.token",
    ],
    censor: "[redacted]",
  },
  ...(IS_PRODUCTION
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "" },
        },
      }),
});

/** Child logger with a fixed component tag, replacing the old `[Prefix]`. */
export const childLogger = (component: string): Logger =>
  logger.child({ component });
