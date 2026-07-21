import { jwtDecode } from "jwt-decode";
import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "access_token";

interface JwtPayload {
  exp?: number;
  sub?: string;
}

const AUTH_ROUTES = ["/", "/signin", "/signup"];

/** Prefix match — covers /expense/dashboard, /journal/notes, etc. */
const PROTECTED_PREFIXES = ["/choose-app", "/journal", "/expense"];

function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/+/g, "/");
  if (path === "/") return "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.includes(normalizePath(pathname));
}

function isProtectedRoute(pathname: string): boolean {
  const path = normalizePath(pathname);
  return PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function isTokenValid(token: string): boolean {
  try {
    const decoded = jwtDecode<JwtPayload>(token);

    if (!decoded.exp) {
      return false;
    }

    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const isAuthenticated = !!token && isTokenValid(token);

  if (isAuthRoute(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL("/choose-app", request.url));
  }

  if (!isAuthenticated && isProtectedRoute(pathname)) {
    const response = NextResponse.redirect(new URL("/signin", request.url));
    response.cookies.delete(ACCESS_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
