import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(
      `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(q)}&maxList=10`,
      { next: { revalidate: 86400 } },
    );
    const data = await res.json();
    const [, , , rows] = data as [number, string[], unknown, [string, string][]];
    const results = (rows || []).map(([code, name]) => ({ code, name }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
