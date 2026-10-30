import fetch from "node-fetch";
import {
  GROQ_API_KEY,
  GROQ_API_URL,
  GROQ_EMBEDDING_MODEL,
  GROQ_EMBEDDING_URL,
  GROQ_MODEL,
  GROQ_FALLBACK_MODEL,
  GROQ_MAX_RETRIES,
  GROQ_REASONING_EFFORT,
} from "../../config.js";
import { sleep, backoffDelay } from "../../utils/retry.js";
import { childLogger } from "../../utils/logger.js";
import type {
  ChatMessage,
  GroqEmbeddingResponse,
  GroqApiError,
  GroqApiResponse,
  GroqChatOptions,
} from "../../types/index.js";
import { recordEvalGroqCall } from "../../eval/telemetry.js";

const log = childLogger("llm:groq");

/** Cheap non-cryptographic hash (djb2) used only to correlate log lines for the same query. */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function logGroqCall(info: Record<string, unknown>): void {
  log.debug({ payload: JSON.stringify(info) }, `[Groq]`);
}

/**
 * Single entry point for Groq chat-completion calls.
 */
export async function groqChat(
  messages: ChatMessage[],
  opts: GroqChatOptions = {}
): Promise<string> {
  const {
    temperature = 0.1,
    maxTokens = 2048,
    responseFormat = null,
    label = "groqChat",
    reasoningEffort = GROQ_REASONING_EFFORT,
  } = opts;

  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const queryHash = hashString(lastUserMessage);

  const models: string[] = [GROQ_MODEL, GROQ_FALLBACK_MODEL].filter(
    Boolean
  ) as string[];
  let lastError: Error | undefined;

  for (const model of models) {
    for (let attempt = 1; attempt <= GROQ_MAX_RETRIES; attempt++) {
      const start = Date.now();
      try {
        const body: any = {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        };
        if (responseFormat) body.response_format = responseFormat;
        if (reasoningEffort) body.reasoning_effort = reasoningEffort;

        const response = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify(body),
        });

        const latencyMs = Date.now() - start;

        if (response.status === 429) {
          const retryAfterHeader = Number(response.headers.get("retry-after"));
          const waitMs =
            Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
              ? retryAfterHeader * 1000
              : backoffDelay(attempt);
          logGroqCall({
            label,
            model,
            attempt,
            latencyMs,
            status: 429,
            queryHash,
          });
          lastError = new Error("Groq API rate limit (429) exceeded");
          if (attempt < GROQ_MAX_RETRIES) {
            await sleep(waitMs);
            continue;
          }
          break;
        }

        if (!response.ok) {
          const errorBody = (await response
            .json()
            .catch(() => ({}))) as GroqApiError;
          const message =
            errorBody.error?.message || `Groq API error: ${response.status}`;
          const failedGeneration = errorBody.error?.failed_generation;
          logGroqCall({
            label,
            model,
            attempt,
            latencyMs,
            status: response.status,
            error: message,
            queryHash,
          });
          if (failedGeneration) {
            log.warn(
              `[Groq] failed_generation (${failedGeneration.length} chars, label=${label}): ${failedGeneration.slice(0, 300)}`
            );
          }
          lastError = new Error(message);

          if (response.status >= 500 && attempt < GROQ_MAX_RETRIES) {
            await sleep(backoffDelay(attempt));
            continue;
          }
          break;
        }

        const data = (await response.json()) as GroqApiResponse;
        const usage = data.usage || {};
        logGroqCall({
          label,
          model,
          attempt,
          latencyMs,
          status: 200,
          queryHash,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
        });
        recordEvalGroqCall({
          label,
          model,
          promptTokens: usage.prompt_tokens ?? 0,
          completionTokens: usage.completion_tokens ?? 0,
        });

        const finishReason = data.choices?.[0]?.finish_reason;
        if (finishReason === "length") {
          log.warn(
            `[Groq] Response truncated: hit max_tokens=${maxTokens} (label=${label}, model=${model}). Raise maxTokens or lower reasoningEffort.`
          );
        }

        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          lastError = new Error("Groq API returned an empty response");
          break;
        }
        return content;
      } catch (e: any) {
        const latencyMs = Date.now() - start;
        logGroqCall({
          label,
          model,
          attempt,
          latencyMs,
          error: e.message,
          queryHash,
        });
        lastError = e;
        if (attempt < GROQ_MAX_RETRIES) {
          await sleep(backoffDelay(attempt));
          continue;
        }
      }
    }
  }

  throw lastError || new Error("Groq request failed for an unknown reason");
}

/** Single entry point for Groq embedding calls. */
export async function groqEmbed(
  input: string,
  opts: { model?: string; label?: string } = {}
): Promise<number[]> {
  const model = opts.model || GROQ_EMBEDDING_MODEL;
  const label = opts.label || "groqEmbed";
  const queryHash = hashString(input);
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= GROQ_MAX_RETRIES; attempt++) {
    const start = Date.now();
    try {
      const response = await fetch(GROQ_EMBEDDING_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({ model, input }),
      });

      const latencyMs = Date.now() - start;

      if (response.status === 429) {
        const retryAfterHeader = Number(response.headers.get("retry-after"));
        const waitMs =
          Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
            ? retryAfterHeader * 1000
            : backoffDelay(attempt);
        logGroqCall({
          label,
          model,
          attempt,
          latencyMs,
          status: 429,
          queryHash,
        });
        lastError = new Error("Groq embedding rate limit (429) exceeded");
        if (attempt < GROQ_MAX_RETRIES) {
          await sleep(waitMs);
          continue;
        }
        break;
      }

      if (!response.ok) {
        const errorBody = (await response
          .json()
          .catch(() => ({}))) as GroqApiError;
        const message =
          errorBody.error?.message ||
          `Groq embeddings error: ${response.status}`;
        logGroqCall({
          label,
          model,
          attempt,
          latencyMs,
          status: response.status,
          error: message,
          queryHash,
        });
        lastError = new Error(message);
        if (response.status >= 500 && attempt < GROQ_MAX_RETRIES) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        break;
      }

      const data = (await response.json()) as GroqEmbeddingResponse;
      const embedding = data.data?.[0]?.embedding;
      if (!Array.isArray(embedding) || embedding.length === 0) {
        lastError = new Error("Groq embeddings API returned empty embedding");
        break;
      }

      logGroqCall({
        label,
        model,
        attempt,
        latencyMs,
        status: 200,
        queryHash,
        promptTokens: data.usage?.prompt_tokens,
      });

      return embedding;
    } catch (e: unknown) {
      const latencyMs = Date.now() - start;
      const error = e as Error;
      logGroqCall({
        label,
        model,
        attempt,
        latencyMs,
        error: error.message,
        queryHash,
      });
      lastError = error;
      if (attempt < GROQ_MAX_RETRIES) {
        await sleep(backoffDelay(attempt));
        continue;
      }
    }
  }

  throw lastError || new Error("Groq embedding request failed");
}
