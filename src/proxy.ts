import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * Page-level redirects based on the session cookie alone (signature + expiry, no database). This is a
 * convenience layer: the API routes still authorize every request themselves.
 */
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const signedIn = Boolean(await verifySession(req.cookies.get(SESSION_COOKIE)?.value));
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (!signedIn && !isAuthPage) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (signedIn && isAuthPage) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  // Pages only: skip API routes, Next internals and files with an extension (icons, images, fonts).
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
