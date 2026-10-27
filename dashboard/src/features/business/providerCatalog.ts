/** Reference prices, not billing data. Exact IDs only; unknown IDs never inherit a rate. */
export const pricingCheckedAt = "2026-10-27";
export const providers = [
  {
    value: "openai",
    label: "OpenAI",
    description: "GPT models · OpenAI API key",
    pricing: "https://developers.openai.com/api/docs/pricing",
  },
  {
    value: "anthropic",
    label: "Anthropic",
    description: "Claude models · Anthropic API key",
    pricing: "https://platform.claude.com/docs/en/about-claude/pricing",
  },
  {
    value: "gemini",
    label: "Google Gemini",
    description: "Gemini models · Google AI Studio key",
    pricing: "https://ai.google.dev/gemini-api/docs/pricing",
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    description: "Multiple model makers · OpenRouter key",
    pricing: "https://openrouter.ai/models",
  },
] as const;
export interface ModelDetails {
  name: string;
  description: string;
  input: number;
  output: number;
  source: string;
}
const openai = "https://developers.openai.com/api/docs/models/";
const claude = "https://platform.claude.com/docs/en/about-claude/pricing";
const gemini = "https://ai.google.dev/gemini-api/docs/pricing";
const models: Record<string, ModelDetails> = {
  "openai:gpt-4o-mini": {
    name: "GPT-4o mini",
    description: "Small GPT model. Deprecated; check provider availability.",
    input: 0.15,
    output: 0.6,
    source: openai + "gpt-4o-mini",
  },
  "openai:gpt-5-mini": {
    name: "GPT-5 mini",
    description: "Compact reasoning model. Deprecated; check provider availability.",
    input: 0.25,
    output: 2,
    source: openai + "gpt-5-mini",
  },
  "anthropic:claude-sonnet-4-5": {
    name: "Claude Sonnet 4.5",
    description: "Claude analysis model. Deprecated; check provider availability.",
    input: 3,
    output: 15,
    source: claude,
  },
  "gemini:gemini-3.1-flash-lite": {
    name: "Gemini 3.1 Flash-Lite",
    description: "Efficient Gemini model for high-volume text processing.",
    input: 0.25,
    output: 1.5,
    source: gemini,
  },
  "gemini:gemini-3.5-flash-lite": {
    name: "Gemini 3.5 Flash-Lite",
    description: "Gemini model for lightweight analysis and text processing.",
    input: 0.3,
    output: 2.5,
    source: gemini,
  },
  "openai:gpt-4.1-mini": {
    name: "GPT-4.1 mini",
    description: "Smaller GPT-4.1 model for everyday summaries.",
    input: 0.4,
    output: 1.6,
    source: openai + "gpt-4.1-mini",
  },
  "openai:gpt-4.1": {
    name: "GPT-4.1",
    description: "Larger GPT-4.1 model for more detailed requests.",
    input: 2,
    output: 8,
    source: openai + "gpt-4.1",
  },
  "anthropic:claude-haiku-4-5": {
    name: "Claude Haiku 4.5",
    description: "Compact Claude model. Legacy generation; check availability.",
    input: 1,
    output: 5,
    source: claude,
  },
  "anthropic:claude-sonnet-4-6": {
    name: "Claude Sonnet 4.6",
    description: "Claude model for detailed analysis. Legacy generation.",
    input: 3,
    output: 15,
    source: claude,
  },
  "gemini:gemini-2.5-flash": {
    name: "Gemini 2.5 Flash",
    description: "Gemini reasoning model for text summaries.",
    input: 0.3,
    output: 2.5,
    source: gemini,
  },
  "gemini:gemini-2.5-flash-lite": {
    name: "Gemini 2.5 Flash-Lite",
    description: "Small Gemini model with lower text token rates.",
    input: 0.1,
    output: 0.4,
    source: gemini,
  },
};
models["openai:gpt-4.1-mini-2025-04-14"] = models["openai:gpt-4.1-mini"];
models["openai:gpt-4.1-2025-04-14"] = models["openai:gpt-4.1"];
models["anthropic:claude-haiku-4-5-20251001"] = models["anthropic:claude-haiku-4-5"];
models["openai:gpt-4o-mini-2024-07-18"] = models["openai:gpt-4o-mini"];
models["openai:gpt-5-mini-2025-08-07"] = models["openai:gpt-5-mini"];
models["anthropic:claude-sonnet-4-5-20250929"] = models["anthropic:claude-sonnet-4-5"];
export const modelDetails = (provider: string, model: string): ModelDetails | undefined =>
  models[provider + ":" + model];
export const providerDetails = (provider: string) =>
  providers.find((item) => item.value === provider);
export const exampleCost = (details: ModelDetails) =>
  (details.input * 1000 + details.output * 500) / 1000000;
export const usd = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
