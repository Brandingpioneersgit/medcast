import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { referralCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MC-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone } = await request.json();

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Name, email, and phone are required" }, { status: 400 });
    }

    // Check if already has a code
    const existing = await db.query.referralCodes.findFirst({
      where: eq(referralCodes.patientEmail, email),
    });
    if (existing) {
      return NextResponse.json({ code: existing.code, existing: true });
    }

    const code = generateCode();
    await db.insert(referralCodes).values({
      patientName: name,
      patientEmail: email,
      patientPhone: phone,
      code,
      rewardType: "cash",
      rewardAmountUsd: "100",
      isActive: true,
      usesCount: 0,
    });

    return NextResponse.json({ code, existing: false }, { status: 201 });
  } catch (error) {
    console.error("Referral error:", error);
    return NextResponse.json({ error: "Failed to create referral code" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const referral = await db.query.referralCodes.findFirst({
    where: eq(referralCodes.code, code),
  });

  if (!referral || !referral.isActive) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    rewardAmount: referral.rewardAmountUsd,
    rewardType: referral.rewardType,
  });
}
