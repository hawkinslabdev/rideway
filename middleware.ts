// middleware.ts

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Define public paths that don't require authentication
    const publicPaths = [
      "/setup",
      "/auth/signin",
      "/auth/forgot-password",
      "/auth/reset-password",
    ];
    
    // Allow access to API routes needed for integrations
    if (
      req.nextUrl.pathname.startsWith("/api/user/integrations") ||
      req.nextUrl.pathname.startsWith("/api/auth")
    ) {
      return NextResponse.next();
    }
    
    // Allow access to password reset page with token
    if (
      req.nextUrl.pathname.startsWith("/auth/reset-password/")
    ) {
      return NextResponse.next();
    }
    
    // Check if the current path is in the public paths list
    const isPublicPath = publicPaths.includes(req.nextUrl.pathname);
    
    // Allow access to public paths without authentication
    if (isPublicPath) {
      return NextResponse.next();
    }

    // Redirect to setup if no user exists and not already on a public page
    if (!req.nextauth.token) {
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
        // Always allow API routes needed for integrations
        if (
          req.nextUrl.pathname.startsWith("/api/user/integrations") ||
          req.nextUrl.pathname.startsWith("/api/auth")
        ) {
          return true;
        }
        
        // Check if this is a password reset page with token
        if (req.nextUrl.pathname.startsWith("/auth/reset-password/")) {
          return true;
        }
        
        // Check if this is a public page
        if (
          req.nextUrl.pathname === "/setup" ||
          req.nextUrl.pathname === "/auth/signin" ||
          req.nextUrl.pathname === "/auth/forgot-password"
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
    "/auth/:path*",
    "/api/dashboard/:path*",
    "/api/motorcycles/:path*",
    "/api/user/:path*",
    "/api/auth/:path*",
    // Prevent static/public files from triggering middleware
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};