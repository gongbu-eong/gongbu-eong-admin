"use server";

import { redirect } from "next/navigation";
import {
  authenticateAdmin,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
  getRequestMetadata,
} from "@/features/admin/server/auth.repository";
import { cookies } from "next/headers";

export type LoginAdminState = {
  error: "invalid" | "locked" | null;
  loginId: string;
  attempt: number;
};

export async function loginAdmin(
  previousState: LoginAdminState,
  formData: FormData,
): Promise<LoginAdminState> {
  const loginId = String(formData.get("loginId") || "");
  const password = String(formData.get("password") || "");
  const metadata = await getRequestMetadata();

  const result = await authenticateAdmin(loginId, password, metadata);

  if (!result.ok) {
    return {
      error: result.reason,
      loginId,
      attempt: previousState.attempt + 1,
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    getAdminSessionCookieName(),
    result.sessionToken,
    getAdminSessionCookieOptions(result.maxAge),
  );

  redirect("/");
}
