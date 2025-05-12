// File: middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Define public paths that don't require authentication
    const publicPaths = [
      "/setup",
      "/auth/signin",
      "/auth/forgot-password",
      "/auth/reset-password",
    ];
    
    // Get the pathname of the request
    const pathname = req.nextUrl.pathname;
    
    // Allow direct access to uploaded files
    if (pathname.startsWith("/uploads/")) {
      // Skip authentication for uploaded files
      return NextResponse.next();
    }
    
    // Allow access to API routes needed for integrations
    if (
      pathname.startsWith("/api/user/integrations") ||
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/uploads") // Allow access to uploads API
    ) {
      return NextResponse.next();
    }
    
    // Allow access to password reset page with token
    if (
      pathname.startsWith("/auth/reset-password/")
    ) {
      return NextResponse.next();
    }
    
    // Check if the current path is in the public paths list
    const isPublicPath = publicPaths.includes(pathname);
    
    // Allow access to public paths without authentication
    if (isPublicPath) {
      return NextResponse.next();
    }

    // Redirect to setup if no user exists and not already on a public page
    if (!req.nextauth.token) {
      return NextResponse.redirect(new URL("/setup", req.url));
    }

    // Initialize the response
    const response = NextResponse.next();
    
    // Set caching headers based on the endpoint type
    if (req.method === 'GET') {
      // API routes with different caching strategies
      if (pathname.startsWith('/api/')) {
        if (pathname.startsWith('/api/motorcycles') || 
            pathname.startsWith('/api/maintenance') ||
            pathname.startsWith('/api/service-history')) {
          
          // More specific path handling
          if (pathname.includes('dashboard') || 
              pathname.includes('/activity') || 
              pathname.includes('/user')) {
            // Short cache for dynamic data
            response.headers.set('Cache-Control', 'public, max-age=10, stale-while-revalidate=60');
          } else if (pathname.match(/\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+$/)) {
            // Medium cache for specific item data (like /motorcycles/123)
            response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=600');
          } else {
            // Longer cache for more static data
            response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=3600');
          }
        } else if (pathname.startsWith('/api/health')) {
          // Health checks can be cached briefly
          response.headers.set('Cache-Control', 'public, max-age=30');
        } else {
          // Default for other API endpoints - no caching for user-specific/sensitive data
          response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
          response.headers.set("Pragma", "no-cache");
          response.headers.set("Expires", "0");
        }
      } else if (pathname.startsWith('/uploads/')) {
        // Aggressive caching for uploaded images
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // Default for protected routes - no caching
        response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        response.headers.set("Pragma", "no-cache");
        response.headers.set("Expires", "0");
      }
    } else {
      // For non-GET requests, always disable caching
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
    }

    return response;
  },
  {
    pages: {
      signIn: "/auth/signin",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        // Always allow uploads directory
        if (req.nextUrl.pathname.startsWith("/uploads/")) {
          return true;
        }
        
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
    "/api/maintenance/:path*",
    "/api/service-history/:path*",
    "/api/uploads/:path*", // Changed to API uploads, not direct uploads
    // Prevent static/public files from triggering middleware
    "/((?!_next/static|_next/image|favicon.ico|uploads|public).*)",
  ],
};
