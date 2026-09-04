"use server";

import { redirect } from "next/navigation";
import {
  authenticateAdmin,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
  getRequestMetadata,
} from "@/features/admin/server/auth.repository";
import { cookies } from "next/headers";

export async function loginAdmin(formData: FormData) {
  const loginId = String(formData.get("loginId") || "");
  const password = String(formData.get("password") || "");
  const metadata = await getRequestMetadata();

  const result = await authenticateAdmin(loginId, password, metadata);

  if (!result) {
    redirect("/login?error=invalid");
  }

  const cookieStore = await cookies();
  cookieStore.set(
    getAdminSessionCookieName(),
    result.sessionToken,
    getAdminSessionCookieOptions(result.maxAge),
  );

  redirect("/");
}
