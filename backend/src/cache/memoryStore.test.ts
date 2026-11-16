import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryCacheStore } from "./memoryStore.js";
import type { CacheEnvelope } from "./store.js";

describe("MemoryCacheStore", () => {
  let store: MemoryCacheStore;

  beforeEach(() => {
    store = new MemoryCacheStore();
  });

  afterEach(async () => {
    await store.close();
  });

  it("stores and retrieves raw cache envelopes", async () => {
    const envelope: CacheEnvelope<{ title: string }> = {
      value: { title: "Inception" },
      freshUntil: Date.now() + 60000,
    };

    await store.setRaw("movie:1", envelope, 60);
    const retrieved = await store.getRaw<{ title: string }>("movie:1");

    expect(retrieved).toBeDefined();
    expect(retrieved?.value.title).toBe("Inception");
  });

  it("returns undefined for non-existent key", async () => {
    const res = await store.getRaw("non_existent_key");
    expect(res).toBeUndefined();
  });

  it("deletes specific keys", async () => {
    const env: CacheEnvelope<string> = {
      value: "val",
      freshUntil: Date.now() + 1000,
    };
    await store.setRaw("k1", env, 10);
    await store.setRaw("k2", env, 10);

    await store.del(["k1"]);
    expect(await store.getRaw("k1")).toBeUndefined();
    expect(await store.getRaw("k2")).toBeDefined();
  });

  it("deletes keys by prefix", async () => {
    const env: CacheEnvelope<string> = {
      value: "val",
      freshUntil: Date.now() + 1000,
    };
    await store.setRaw("trending:indian", env, 10);
    await store.setRaw("trending:global", env, 10);
    await store.setRaw("search:avatar", env, 10);

    const deletedCount = await store.delByPrefix("trending:");
    expect(deletedCount).toBe(2);
    expect(await store.getRaw("trending:indian")).toBeUndefined();
    expect(await store.getRaw("trending:global")).toBeUndefined();
    expect(await store.getRaw("search:avatar")).toBeDefined();
  });

  it("always returns true on ping", async () => {
    expect(await store.ping()).toBe(true);
  });
});
