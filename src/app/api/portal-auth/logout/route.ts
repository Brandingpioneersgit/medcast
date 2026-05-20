import { NextResponse } from "next/server";
import { destroyPortalSession } from "@/lib/auth/portal";

export async function POST() {
  await destroyPortalSession();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://medcasts.com";
  return NextResponse.redirect(new URL("/portal", site));
}
