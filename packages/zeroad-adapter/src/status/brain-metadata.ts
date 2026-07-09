/**
 * Brain metadata extraction utilities
 * Parses brain IDs and configurations to extract provider and model information
 */

export interface BrainMetadata {
  brainId: string;
  name: string;
  provider: string;
  model: string;
}

/**
 * Extract provider and model from brain ID
 * Examples:
 *   "ollama-llama2" → { provider: "ollama", model: "llama2" }
 *   "openai-gpt4" → { provider: "openai", model: "gpt4" }
 *   "anthropic-claude3" → { provider: "anthropic", model: "claude3" }
 */
export function parseBrainId(brainId: string): { provider: string; model: string } {
  const parts = brainId.split('-');

  if (parts.length < 2) {
    return {
      provider: 'unknown',
      model: 'unknown',
    };
  }

  const provider = parts[0].toLowerCase();
  const model = parts.slice(1).join('-').toLowerCase();

  return {
    provider: normalizeProvider(provider),
    model: normalizeModel(model),
  };
}

/**
 * Normalize provider names to human-readable format
 */
function normalizeProvider(provider: string): string {
  const providers: Record<string, string> = {
    ollama: 'Ollama',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    gemini: 'Google Gemini',
    claude: 'Anthropic Claude',
    gpt: 'OpenAI',
    groq: 'Groq',
    together: 'Together AI',
    llama: 'Meta Llama',
    mistral: 'Mistral',
    cohere: 'Cohere',
  };

  return providers[provider] || capitalize(provider);
}

/**
 * Normalize model names to human-readable format
 */
function normalizeModel(model: string): string {
  const models: Record<string, string> = {
    // Ollama models
    llama2: 'Llama 2',
    'llama2:7b': 'Llama 2 7B',
    'llama2:13b': 'Llama 2 13B',
    'llama2:70b': 'Llama 2 70B',
    llama3: 'Llama 3',
    'llama3:8b': 'Llama 3 8B',
    'llama3:70b': 'Llama 3 70B',
    mistral: 'Mistral 7B',
    neural: 'Neural Chat',
    orca: 'Orca',

    // OpenAI models
    'gpt4': 'GPT-4',
    'gpt-4': 'GPT-4',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'gpt3.5': 'GPT-3.5 Turbo',

    // Anthropic Claude models
    'claude3-opus': 'Claude 3 Opus',
    'claude3-sonnet': 'Claude 3 Sonnet',
    'claude3-haiku': 'Claude 3 Haiku',
    'claude-3-opus': 'Claude 3 Opus',
    'claude-3-sonnet': 'Claude 3 Sonnet',
    'claude-3-haiku': 'Claude 3 Haiku',

    // Google models
    'gemini-pro': 'Gemini Pro',
    'palm2': 'PaLM 2',

    // Groq models
    'mixtral': 'Mixtral 8x7B',
    'llama-2': 'Llama 2',

    // Default
    builtin: 'Built-in',
    reference: 'Reference',
  };

  return models[model] || capitalize(model);
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

/**
 * Extract brain metadata from ID and optional config
 */
export function extractBrainMetadata(
  brainId: string,
  brainName: string,
  config?: { provider?: string; model?: string }
): BrainMetadata {
  let provider = config?.provider;
  let model = config?.model;

  // If provider/model not in config, try to parse from brain ID
  if (!provider || !model) {
    const parsed = parseBrainId(brainId);
    provider = provider || parsed.provider;
    model = model || parsed.model;
  }

  return {
    brainId,
    name: brainName,
    provider: provider || 'Unknown',
    model: model || 'Unknown',
  };
}
