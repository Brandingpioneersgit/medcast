import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

const CSRF_COOKIE = "csrf_token";

/**
 * GET — set the CSRF token as a signed cookie and return it as JSON so the
 * client can read it and send it as the `x-csrf-token` header on mutations.
 */
export async function GET(request: NextRequest) {
  const token = randomBytes(32).toString("base64url");

  const response = NextResponse.json({ token });
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60,
    path: "/",
  });

  return response;
}
