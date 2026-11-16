import { vi } from "vitest";
import type { Request, Response } from "express";

/**
 * Creates mock Express Request and Response objects.
 */
export function createMockReqRes(
  options: {
    body?: any;
    query?: any;
    params?: any;
    headers?: Record<string, string>;
    user?: any;
  } = {}
) {
  const req = {
    body: options.body || {},
    query: options.query || {},
    params: options.params || {},
    headers: options.headers || {},
    user: options.user,
    ip: "127.0.0.1",
    get: vi.fn((header: string) => options.headers?.[header.toLowerCase()]),
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn();

  return { req, res, next };
}

/**
 * Mock implementation of in-memory key-value cache store for tests.
 */
export function createMockCacheStore() {
  const store = new Map<string, any>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: any) => {
      store.set(key, value);
    }),
    del: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    has: vi.fn(async (key: string) => store.has(key)),
    invalidatePrefix: vi.fn(async (prefix: string) => {
      for (const k of store.keys()) {
        if (k.startsWith(prefix)) store.delete(k);
      }
    }),
    clear: () => store.clear(),
    raw: store,
  };
}
