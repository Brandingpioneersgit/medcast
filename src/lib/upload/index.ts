import { writeFile, mkdir } from "fs/promises";
import path from "path";

export interface UploadResult {
  url: string;
  provider: "cloudinary" | "local";
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const hasCloudinary =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (hasCloudinary) {
    return uploadToCloudinary(file);
  }
  return uploadToLocal(file);
}

async function uploadToCloudinary(file: File): Promise<UploadResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "medcasts";
  const signature = await signCloudinary({ timestamp, folder }, apiSecret);

  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", apiKey);
  fd.append("timestamp", String(timestamp));
  fd.append("folder", folder);
  fd.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status}`);
  const json = await res.json();
  return { url: json.secure_url, provider: "cloudinary" };
}

async function signCloudinary(params: Record<string, string | number>, secret: string) {
  const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  const toSign = `${sorted}${secret}`;
  const hashBuffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(toSign));
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function uploadToLocal(file: File): Promise<UploadResult> {
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, name), buf);
  return { url: `/uploads/${name}`, provider: "local" };
}
