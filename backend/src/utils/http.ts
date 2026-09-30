import fetch, { Response, RequestInit } from "node-fetch";

/** Thrown when a request is aborted by its own deadline rather than by the peer. */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

/**
 * fetch with a hard deadline.
 *
 * node-fetch has no built-in timeout, so a peer that accepts a connection and
 * then never responds will hang until the socket is torn down. That is fine
 * from a home connection where everything answers quickly, and not fine from a
 * datacenter IP where some hosts throttle or blackhole requests.
 */
export async function fetchWithTimeout(
  url: string,
  ms: number,
  init: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal as RequestInit["signal"],
    });
  } catch (e: unknown) {
    // AbortController surfaces as a generic AbortError; translate it so callers
    // can tell "we gave up" apart from "the network failed".
    if ((e as Error)?.name === "AbortError") throw new TimeoutError(ms);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const TIMED_OUT = Symbol("timed-out");

/**
 * Runs a best-effort task that must never reject and never outlive its budget.
 *
 * The deadline is enforced by racing against a timer rather than by relying on
 * the task to honour the abort signal. Aborting only works if the callee
 * actually passes the signal down to its fetches, and a task that ignores it
 * would otherwise keep the caller waiting indefinitely. The signal is still
 * provided so cooperative callees can release the socket promptly.
 *
 * Logs one structured line per call, so a slow dependency shows up in the logs
 * by name instead of merely as overall latency.
 */
export async function bestEffort<T>(
  label: string,
  ms: number,
  fallback: T,
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  const start = Date.now();
  let timer: NodeJS.Timeout | undefined;

  const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(TIMED_OUT);
    }, ms);
  });

  try {
    const result = await Promise.race([fn(controller.signal), deadline]);

    if (result === TIMED_OUT) {
      console.warn(
        JSON.stringify({
          tag: "grounding",
          source: label,
          ms: Date.now() - start,
          status: "timeout",
        })
      );
      return fallback;
    }

    console.log(
      JSON.stringify({
        tag: "grounding",
        source: label,
        ms: Date.now() - start,
        status: "ok",
        chars: typeof result === "string" ? result.length : undefined,
      })
    );
    return result as T;
  } catch (e: unknown) {
    const err = e as Error;
    console.warn(
      JSON.stringify({
        tag: "grounding",
        source: label,
        ms: Date.now() - start,
        status: err instanceof TimeoutError ? "timeout" : "error",
        error: err?.message,
      })
    );
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
