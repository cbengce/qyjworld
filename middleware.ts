import { NextResponse, type NextRequest } from "next/server";
// The URL determines language; existing cookies and headers are forwarded.
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-qyj-locale", /^\/zh(?:\/|$)/.test(request.nextUrl.pathname) ? "zh" : "en");
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ["/en/:path*", "/zh/:path*"] };
