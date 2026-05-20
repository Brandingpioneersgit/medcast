export function isTurnstileEnabled() {
  return !!process.env.TURNSTILE_SECRET_KEY && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}

export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<boolean> {
  if (!isTurnstileEnabled()) return true;
  if (!token) return false;

  const fd = new FormData();
  fd.append("secret", process.env.TURNSTILE_SECRET_KEY!);
  fd.append("response", token);
  if (ip) fd.append("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body: fd,
    });
    const json = await res.json();
    return !!json.success;
  } catch {
    return false;
  }
}
