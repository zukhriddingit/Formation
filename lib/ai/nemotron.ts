/**
 * NVIDIA Nemotron client (OpenAI-compatible chat completions).
 *
 * NVIDIA's hosted inference endpoint (integrate.api.nvidia.com/v1) speaks the
 * same wire format as OpenAI, so we talk to it with plain `fetch` and avoid an
 * extra SDK dependency. Every helper here is best-effort: if the key is missing,
 * the request times out, or the model returns junk, callers fall back to the
 * deterministic heuristics. The LLM is never on the critical path.
 */

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1";
// The hosted 49B model can take 15-25s to generate a full structured response,
// so default generously; callers always fall back to heuristics on timeout.
const DEFAULT_TIMEOUT_MS = 30_000;

export function isNemotronConfigured() {
  return Boolean(process.env.NVIDIA_API_KEY);
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatOptions = {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

/**
 * Low-level chat call. Returns the assistant message text, or null on any
 * failure (missing key, network error, timeout, non-200, malformed body).
 */
export async function nemotronChat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string | null> {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    return null;
  }

  const baseUrl = (process.env.NVIDIA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = process.env.NVIDIA_MODEL ?? DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 700,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[nemotron] request failed with status ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    console.warn("[nemotron] request error", error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Pull the first balanced JSON object out of a model response. Models often wrap
 * JSON in prose or ```json fences, so we scan for the outermost { ... }.
 */
export function extractJsonObject<T = unknown>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const candidate = raw.slice(start, end + 1);

  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}
