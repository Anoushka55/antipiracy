import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "./lib/constants";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname === "/" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.svg" ||
    pathname === "/schand-logo.png" ||
    pathname === "/kpmg-logo.svg"
  ) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) return NextResponse.next();
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|schand-logo.png|kpmg-logo.svg).*)"],
};
