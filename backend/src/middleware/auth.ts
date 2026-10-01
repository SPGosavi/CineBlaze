import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { FIREBASE_PROJECT_ID } from "../config.js";
import { upsertUser } from "../db/repositories.js";
import { childLogger } from "../utils/logger.js";

const log = childLogger("auth");

export interface AuthenticatedUser {
  /** Firebase uid, from the token's `sub` claim. */
  uid: string;
  email: string | null;
  displayName: string | null;
  /** Local `users.id`, present only when a database is configured. */
  userId: string | null;
}

declare module "express-serve-static-core" {
  interface Request {
    /** Set by `attachUser` when a valid ID token is presented. */
    user?: AuthenticatedUser;
  }
}

/**
 * Google's public keys for Firebase ID tokens.
 *
 * Verifying a token needs nothing but these and the project id — no
 * service-account JSON, so there is no private key to provision, store or
 * rotate. That is why this uses `jose` rather than firebase-admin, which
 * would have pulled in a much larger dependency and an extra secret purely to
 * check a signature.
 *
 * `createRemoteJWKSet` caches the key set and refetches on rotation.
 */
const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

interface FirebaseClaims extends JWTPayload {
  email?: string;
  name?: string;
  user_id?: string;
}

/**
 * Verifies a Firebase ID token.
 *
 * `jwtVerify` checks the signature, `exp` and `nbf`; issuer and audience are
 * asserted explicitly because a token minted for a *different* Firebase
 * project is signed by the same Google keys and would otherwise pass.
 */
async function verifyIdToken(token: string): Promise<AuthenticatedUser | null> {
  if (!FIREBASE_PROJECT_ID) return null;

  try {
    const { payload } = await jwtVerify<FirebaseClaims>(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });

    const uid = payload.sub ?? payload.user_id;
    if (!uid) return null;

    return {
      uid,
      email: payload.email ?? null,
      displayName: payload.name ?? null,
      userId: null,
    };
  } catch (error) {
    log.debug({ err: (error as Error).message }, "ID token rejected");
    return null;
  }
}

/**
 * Attaches `req.user` when a valid token is present, and does nothing
 * otherwise.
 *
 * Deliberately non-blocking. Discovery, search and detail are public — that is
 * what makes them crawlable — so this cannot be a gate. It exists so that
 * rate limits can be applied per account rather than per IP, and so history
 * can be attributed when there is someone to attribute it to.
 */
export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = bearerToken(req);
  if (!token || !FIREBASE_PROJECT_ID) {
    next();
    return;
  }

  const user = await verifyIdToken(token);
  if (!user) {
    // An invalid token is treated as anonymous rather than as a 401. The
    // endpoints do not require auth, and expiring tokens are routine — the
    // client refreshes them in the background, and a request that happens to
    // straddle the refresh should still return results.
    next();
    return;
  }

  // Mirror into Postgres so history has a local FK to hang off. Failures here
  // are swallowed by the repository: an unreachable database should cost
  // analytics, not the request.
  const row = await upsertUser({
    firebaseUid: user.uid,
    email: user.email,
    displayName: user.displayName,
  });

  req.user = { ...user, userId: row?.id ?? null };
  next();
}

/**
 * Gate for endpoints that genuinely need an identity.
 *
 * Nothing uses this yet — every current route is public — but the
 * personalised recommendation endpoints in Phase 5 will.
 */
export function requireUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export const isAuthConfigured = (): boolean => FIREBASE_PROJECT_ID !== null;
