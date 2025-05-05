// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Allow access to setup page without authentication
    if (req.nextUrl.pathname === "/setup") {
      return NextResponse.next();
    }

    // Redirect to setup if no user exists and not already on signin page
    if (!req.nextauth.token && req.nextUrl.pathname !== "/auth/signin") {
      return NextResponse.redirect(new URL("/setup", req.url));
    }

    // Add cache-control headers to prevent caching of protected routes
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  },
  {
    pages: {
      signIn: "/auth/signin",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public pages
        if (
          req.nextUrl.pathname === "/setup" ||
          req.nextUrl.pathname === "/auth/signin" ||
          req.nextUrl.pathname.startsWith("/api/auth")
        ) {
          return true;
        }
        // Require authentication for all other pages
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/",
    "/garage/:path*",
    "/maintenance/:path*",
    "/history/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/api/dashboard/:path*",
    "/api/motorcycles/:path*",
    "/api/user/:path*",
    // Prevent static/public files from triggering middleware
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
