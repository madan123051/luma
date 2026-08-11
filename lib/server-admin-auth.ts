import "server-only";

const FIREBASE_LOOKUP_URL = "https://identitytoolkit.googleapis.com/v1/accounts:lookup";
const AUTH_LOOKUP_TIMEOUT_MS = 10_000;

type FirebaseLookupUser = {
  localId?: unknown;
  email?: unknown;
  emailVerified?: unknown;
};

type FirebaseLookupResponse = {
  users?: FirebaseLookupUser[];
};

export type VerifiedAdmin = {
  uid: string;
  email: string;
};

export class AdminAuthError extends Error {
  readonly status: 401 | 403 | 503;

  constructor(status: 401 | 403 | 503, message: string) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  return match?.[1] ?? null;
}

function getAdminEmails() {
  return new Set(
    (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Verifies a Firebase ID token without a service-account key and applies the
 * server-side admin allowlist. This helper fails closed when configuration or
 * Firebase verification is unavailable.
 */
export async function requireVerifiedAdmin(request: Request): Promise<VerifiedAdmin> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    throw new AdminAuthError(401, "Sign in is required.");
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const adminEmails = getAdminEmails();
  if (!apiKey || adminEmails.size === 0) {
    throw new AdminAuthError(503, "Admin authentication is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(`${FIREBASE_LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(AUTH_LOOKUP_TIMEOUT_MS),
    });
  } catch {
    throw new AdminAuthError(503, "Admin authentication is temporarily unavailable.");
  }

  if (!response.ok) {
    throw new AdminAuthError(401, "Your sign-in session is invalid or expired.");
  }

  let payload: FirebaseLookupResponse;
  try {
    payload = (await response.json()) as FirebaseLookupResponse;
  } catch {
    throw new AdminAuthError(503, "Admin authentication is temporarily unavailable.");
  }

  const user = payload.users?.[0];
  const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  const uid = typeof user?.localId === "string" ? user.localId : "";

  if (!email || !uid || user?.emailVerified !== true) {
    throw new AdminAuthError(403, "A verified admin email is required.");
  }

  if (!adminEmails.has(email)) {
    throw new AdminAuthError(403, "This account does not have admin access.");
  }

  return { uid, email };
}
