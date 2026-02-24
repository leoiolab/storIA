/**
 * Token estimation for AI context and cost awareness.
 * Uses ~4 chars per token (English) as a conservative heuristic for OpenAI/Claude-style tokenizers.
 * For 200K–1M context models, this helps users see input size and stay within limits.
 */

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed.length) return 0;
  return Math.ceil(trimmed.length / CHARS_PER_TOKEN);
}

export function estimateTokensFromMessages(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>
): number {
  let total = estimateTokens(systemPrompt);
  for (const msg of messages) {
    total += estimateTokens(msg.content || '');
    total += 4; // role + formatting overhead per message
  }
  return total;
}

/** Known model context windows (input) for display and budgeting. */
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4-turbo': 128_000,
  'gpt-4': 8_192,
  'gpt-4-32k': 32_768,
  'gpt-3.5-turbo': 16_385,
  'gpt-3.5-turbo-16k': 16_385,
  'gpt-4-turbo-preview': 128_000,
  'claude-sonnet-4-6': 200_000,
  'claude-opus-4-6': 200_000,
  'claude-haiku-4-5-20251001': 200_000,
  'claude-sonnet-4-20250514': 200_000,
  'claude-3-5-sonnet-20241022': 200_000,
  'claude-3-5-sonnet-20240620': 200_000,
  'claude-3-5-haiku-20241022': 200_000,
  'claude-3-opus-20240229': 200_000,
  'claude-3-sonnet-20240229': 200_000,
  'claude-3-haiku-20240307': 200_000,
};

/** Default context cap when model is unknown (assume long-context). */
export const DEFAULT_CONTEXT_CAP = 200_000;

export function getContextLimitForModel(model: string): number {
  const normalized = model.toLowerCase().trim();
  for (const [key, limit] of Object.entries(MODEL_CONTEXT_LIMITS)) {
    if (normalized.includes(key.replace(/-/g, ' ')) || normalized.includes(key)) {
      return limit;
    }
  }
  return DEFAULT_CONTEXT_CAP;
}

export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
