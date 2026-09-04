import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { query } from "@/features/admin/server/db";

const ADMIN_SESSION_COOKIE = "gongbu_eong_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type AdminUserRow = {
  id: string;
  login_id: string;
  password_hash: string;
  name: string;
  status: string;
};

type AdminSessionRow = {
  id: string;
  login_id: string;
  name: string;
};

type LoginMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

let schemaReady = false;

export async function ensureAdminAuthSchema() {
  if (schemaReady) {
    return;
  }

  await query("CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public");

  await query(`
    CREATE TABLE IF NOT EXISTS public.admin_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      login_id VARCHAR(80) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name VARCHAR(80) NOT NULL DEFAULT '관리자',
      role VARCHAR(40) NOT NULL DEFAULT 'super_admin',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS public.admin_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
      session_token_hash TEXT NOT NULL UNIQUE,
      ip_address INET,
      user_agent TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS public.admin_login_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
      login_id VARCHAR(80),
      success BOOLEAN NOT NULL,
      failure_reason TEXT,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  schemaReady = true;
}

export async function authenticateAdmin(
  loginId: string,
  password: string,
  metadata: LoginMetadata,
) {
  await ensureAdminAuthSchema();

  const normalizedLoginId = loginId.trim();
  const userResult = await query<AdminUserRow>(
    `
      SELECT id, login_id, password_hash, name, status
      FROM public.admin_users
      WHERE login_id = $1
      LIMIT 1
    `,
    [normalizedLoginId],
  );
  const user = userResult.rows[0];

  if (!user || user.status !== "active" || !verifyPassword(password, user.password_hash)) {
    await recordAdminLoginEvent({
      userId: user?.id ?? null,
      loginId: normalizedLoginId,
      success: false,
      failureReason: user?.status !== "active" ? "inactive_admin" : "invalid_credentials",
      metadata,
    });
    return null;
  }

  const sessionToken = randomBytes(32).toString("hex");
  const sessionTokenHash = hashValue(sessionToken);

  await query(
    `
      INSERT INTO public.admin_sessions (
        admin_user_id,
        session_token_hash,
        ip_address,
        user_agent,
        expires_at
      )
      VALUES ($1, $2, $3, $4, NOW() + INTERVAL '8 hours')
    `,
    [
      user.id,
      sessionTokenHash,
      metadata.ipAddress || null,
      metadata.userAgent || null,
    ],
  );

  await query(
    `
      UPDATE public.admin_users
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `,
    [user.id],
  );

  await recordAdminLoginEvent({
    userId: user.id,
    loginId: user.login_id,
    success: true,
    failureReason: null,
    metadata,
  });

  return {
    sessionToken,
    maxAge: SESSION_MAX_AGE_SECONDS,
    user: {
      id: user.id,
      loginId: user.login_id,
      name: user.name,
    },
  };
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function getAdminSession() {
  await ensureAdminAuthSchema();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return null;
  }

  const result = await query<AdminSessionRow>(
    `
      SELECT
        sessions.id,
        users.login_id,
        users.name
      FROM public.admin_sessions sessions
      JOIN public.admin_users users
        ON users.id = sessions.admin_user_id
       AND users.status = 'active'
      WHERE sessions.session_token_hash = $1
        AND sessions.expires_at > NOW()
      LIMIT 1
    `,
    [hashValue(sessionToken)],
  );

  const session = result.rows[0];
  if (!session) {
    return null;
  }

  return {
    sessionId: session.id,
    loginId: session.login_id,
    name: session.name,
  };
}

export async function clearAdminSession() {
  await ensureAdminAuthSchema();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (sessionToken) {
    await query(
      "DELETE FROM public.admin_sessions WHERE session_token_hash = $1",
      [hashValue(sessionToken)],
    );
  }

  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getRequestMetadata(): Promise<LoginMetadata> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");

  return {
    ipAddress: forwardedFor?.split(",")[0]?.trim() || null,
    userAgent: headerStore.get("user-agent") || null,
  };
}

export function getAdminSessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function getAdminSessionCookieName() {
  return ADMIN_SESSION_COOKIE;
}

async function recordAdminLoginEvent(args: {
  userId: string | null;
  loginId: string;
  success: boolean;
  failureReason: string | null;
  metadata: LoginMetadata;
}) {
  await query(
    `
      INSERT INTO public.admin_login_events (
        admin_user_id,
        login_id,
        success,
        failure_reason,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      args.userId,
      args.loginId,
      args.success,
      args.failureReason,
      args.metadata.ipAddress || null,
      args.metadata.userAgent || null,
    ],
  );
}

function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, expectedHash] = passwordHash.split(":");

  if (algorithm !== "scrypt" || !salt || !expectedHash) {
    return false;
  }

  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
