export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object" | "text";
}

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "qwen/qwen3-next-80b-a3b-instruct:free";
const FALLBACK_MODELS = (process.env.OPENROUTER_MODEL_FALLBACKS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
// Hard-refuse any model without the :free suffix so a misconfiguration can't silently burn credits.
const FREE_ONLY = process.env.OPENROUTER_FREE_ONLY !== "false";

function assertFreeModel(model: string) {
  if (FREE_ONLY && !model.endsWith(":free")) {
    throw new Error(
      `Refusing to call paid model "${model}" — set OPENROUTER_FREE_ONLY=false to allow, or use a :free variant.`,
    );
  }
}

export function isAiEnabled() {
  return !!process.env.OPENROUTER_API_KEY;
}

async function callOnce(model: string, opts: CompletionOptions): Promise<{ ok: true; text: string } | { ok: false; status: number; error: string }> {
  const key = process.env.OPENROUTER_API_KEY!;
  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 1024,
  };
  if (opts.responseFormat === "json_object") body.response_format = { type: "json_object" };

  // Hard timeout: free-tier providers occasionally hold streams open indefinitely.
  // Without this, a single stuck call blocks the whole sweep with no way to fall back.
  const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 60000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://medcasts.com",
        "X-Title": "MedCasts",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
    const json = await res.json();
    return { ok: true, text: json.choices?.[0]?.message?.content ?? "" };
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    // Treat aborts + network resets as retryable so we bounce to fallback model.
    const status = err.name === "AbortError" ? 408 : 599;
    return { ok: false, status, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

export async function completion(opts: CompletionOptions): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not set");

  // Primary model from opts or DEFAULT_MODEL, then env-configured fallbacks.
  const chain = [opts.model || DEFAULT_MODEL, ...FALLBACK_MODELS];
  chain.forEach(assertFreeModel);

  let lastErr = "";
  for (const model of chain) {
    const result = await callOnce(model, opts);
    if (result.ok) return result.text;
    // Retryable: rate-limit (429), timeout (408), network reset (599), upstream overload (5xx), quota (402).
    if (
      result.status === 408 ||
      result.status === 429 ||
      result.status === 402 ||
      result.status >= 500
    ) {
      lastErr = `${model} -> ${result.status}: ${result.error.slice(0, 200)}`;
      continue;
    }
    // Non-retryable (400 etc.) — bail fast with the real error rather than cycling.
    throw new Error(`OpenRouter ${model} ${result.status}: ${result.error}`);
  }
  throw new Error(`All free models exhausted. Last error: ${lastErr}`);
}

export async function streamCompletion(opts: CompletionOptions): Promise<ReadableStream<Uint8Array>> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://medcasts.com",
      "X-Title": "MedCasts",
    },
    body: JSON.stringify({
      model: opts.model || DEFAULT_MODEL,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 1024,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) throw new Error(`OpenRouter ${res.status}`);
  return res.body;
}
