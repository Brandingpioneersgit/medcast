import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/auth/portal";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const appointmentId = Number(formData.get("appointmentId"));

  if (!file || appointmentId !== session.appointmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  const uploadDir = process.env.UPLOAD_DIR || "./public/uploads";
  const { mkdir, writeFile } = await import("fs/promises");
  const dir = `${uploadDir}/portal/${appointmentId}`;
  await mkdir(dir, { recursive: true });

  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(`${dir}/${filename}`, buf);

  const url = `/uploads/portal/${appointmentId}/${filename}`;
  return NextResponse.json({ url, name: file.name }, { status: 201 });
}