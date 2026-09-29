import { NextResponse } from "next/server";
import {
  clearAdminSession,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
} from "@/features/admin/server/auth.repository";

export async function POST() {
  await clearAdminSession();

  // A relative redirect preserves the public host/port behind reverse proxies.
  // 303 changes the logout POST into a GET of the login page.
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/login", "Cache-Control": "no-store" },
  });
  response.cookies.set(getAdminSessionCookieName(), "", {
    ...getAdminSessionCookieOptions(0),
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
