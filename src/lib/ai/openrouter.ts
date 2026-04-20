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

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.6";

export function isAiEnabled() {
  return !!process.env.OPENROUTER_API_KEY;
}

export async function completion(opts: CompletionOptions): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");

  const body: Record<string, unknown> = {
    model: opts.model || DEFAULT_MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 1024,
  };
  if (opts.responseFormat === "json_object") body.response_format = { type: "json_object" };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://medcasts.com",
      "X-Title": "MedCasts",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
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
