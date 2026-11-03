import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { shouldOpenDashboardInstead } from "./utils/homeRedirect";

export function proxy(request: NextRequest) {
  // `lgpsm_access_token` is the legacy cookie name; accepted so sessions started before the change keep working
  const token = request.cookies.get("lgpsm_session")?.value || request.cookies.get("lgpsm_access_token")?.value;
  const { pathname } = request.nextUrl;

  // Reopening the site while still signed in lands in the app, not on the marketing home page
  if (shouldOpenDashboardInstead({ pathname, hasSession: !!token, fetchSite: request.headers.get("sec-fetch-site") })) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protect every authenticated dashboard section (role checks happen in the dashboard layout and the API)
  const protectedRoutes = [
    "/dashboard",
    "/events",
    "/user-management",
    "/event-organizer",
    "/earnings",
    "/reports",
    "/settings",
    "/templates",
    "/notification",
    "/notifications",
    "/billing",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !token) {
    const signinUrl = new URL("/signin", request.url);
    // Return to the portal the user last signed in through (see components/auth/authPortal.ts)
    const portal = request.cookies.get("lgpsm_portal")?.value;
    signinUrl.searchParams.set("mode", portal === "admin" ? "admin" : "organizer");
    signinUrl.searchParams.set("from", pathname + request.nextUrl.search);
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/events/:path*",
    "/user-management/:path*",
    "/event-organizer/:path*",
    "/earnings/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/templates/:path*",
    "/notification/:path*",
    "/notifications/:path*",
    "/billing/:path*",
  ],
};
