import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const redirects: Record<string, { pathname: string; search?: string }> = {
  "/dashboard/budget": { pathname: "/dashboard/cashflow", search: "?tab=budget" },
  "/dashboard/ledger": { pathname: "/dashboard/cashflow", search: "?tab=ledger" },
  "/dashboard/personal-cpi": { pathname: "/dashboard/spending-insights", search: "?tab=inflation" },
  "/dashboard/sentiment": { pathname: "/dashboard/market-overview", search: "?tab=tam-ly" },
  "/dashboard/market": { pathname: "/dashboard/market-overview", search: "?tab=tai-san" },
  "/dashboard/macro": { pathname: "/dashboard/market-overview", search: "?tab=vi-mo" },
  "/login": { pathname: "/auth/login" },
};

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const destination = redirects[pathname];

  if (destination) {
    const url = request.nextUrl.clone();
    url.pathname = destination.pathname;
    if (destination.search) url.search = destination.search;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/budget",
    "/dashboard/ledger",
    "/dashboard/personal-cpi",
    "/dashboard/sentiment",
    "/dashboard/market",
    "/dashboard/macro",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|mp3|wav|lottie)$).*)",
  ],
};
