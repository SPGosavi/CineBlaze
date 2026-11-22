import { describe, it, expect, vi, beforeEach } from "vitest";
import { groqChat } from "./groq.js";
import fetch from "node-fetch";

vi.mock("node-fetch", () => ({
  default: vi.fn(),
}));

describe("llm/groq service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns message content on successful chat completion", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: ["Inception", "Interstellar"],
              }),
            },
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 30 },
      }),
    } as any);

    const result = await groqChat([
      { role: "user", content: "Recommend mind-bending sci-fi" },
    ]);
    expect(result).toContain("Inception");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 rate limits and succeeds on subsequent attempt", async () => {
    // 1st attempt: 429 rate limit
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: { get: () => "0" },
      text: async () =>
        JSON.stringify({ error: { message: "Rate limit exceeded" } }),
    } as any);

    // 2nd attempt: 200 OK
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "Success response after 429" } }],
      }),
    } as any);

    const result = await groqChat([{ role: "user", content: "Hello" }], {
      maxTokens: 100,
    });
    expect(result).toBe("Success response after 429");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws an error when all retries and fallback models fail", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => null },
      text: async () => "Internal Server Error",
    } as any);

    await expect(
      groqChat([{ role: "user", content: "Fail test" }])
    ).rejects.toThrow();
  });
});
