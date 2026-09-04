import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  clearAdminSession,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
} from "@/features/admin/server/auth.repository";

export async function POST(request: NextRequest) {
  await clearAdminSession();

  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(getAdminSessionCookieName(), "", {
    ...getAdminSessionCookieOptions(0),
    maxAge: 0,
  });

  return response;
}
