import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  clearAdminSession,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
} from "@/features/admin/server/auth.repository";

export async function POST(request: NextRequest) {
  await clearAdminSession();

  const response = NextResponse.redirect(getPublicUrl(request, "/login"));
  response.cookies.set(getAdminSessionCookieName(), "", {
    ...getAdminSessionCookieOptions(0),
    maxAge: 0,
  });

  return response;
}

function getPublicUrl(request: NextRequest, pathname: string) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host;
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");

  return new URL(pathname, `${proto}://${host}`);
}
