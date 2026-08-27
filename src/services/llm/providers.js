// src/services/llm/providers.js
// Registre des fournisseurs LLM disponibles pour l'analyse des commandes vocales.
// Chaque provider expose la même interface : complete({ system, user }) → texte brut.
// Le choix se fait par configuration (AI_PROVIDER) ou par requête (champ "provider").
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

// Clients instanciés à la demande (les constructeurs échouent si la clé est absente)
const clients = {};

function getAnthropicClient() {
  if (!clients.anthropic) {
    clients.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return clients.anthropic;
}

function getOpenAICompatibleClient(cacheKey, apiKey, baseURL) {
  if (!clients[cacheKey]) {
    clients[cacheKey] = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
  }
  return clients[cacheKey];
}

// Appel commun aux APIs "chat completions" (OpenAI et DeepSeek)
async function openAICompatibleComplete(client, model, { system, user }) {
  const completion = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    temperature: 0.3,
    // Force une sortie JSON valide (supporté par OpenAI et DeepSeek)
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  return completion.choices[0].message.content;
}

const PROVIDERS = {
  claude: {
    name: 'claude',
    label: 'Claude (Anthropic)',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    // AI_MODEL conservé comme alias historique (config d'origine du projet)
    getModel: () =>
      process.env.CLAUDE_MODEL || process.env.AI_MODEL || 'claude-opus-5',
    complete: async ({ system, user, model }) => {
      // Pas de temperature : rejetée (400) par les modèles Claude 5
      const message = await getAnthropicClient().messages.create({
        model,
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: user }],
      });
      return message.content[0].text;
    },
  },

  chatgpt: {
    name: 'chatgpt',
    label: 'ChatGPT (OpenAI)',
    apiKeyEnv: 'OPENAI_API_KEY',
    getModel: () => process.env.OPENAI_MODEL || 'gpt-4o-mini',
    complete: async ({ system, user, model }) => {
      const client = getOpenAICompatibleClient(
        'openai',
        process.env.OPENAI_API_KEY
      );
      return openAICompatibleComplete(client, model, { system, user });
    },
  },

  deepseek: {
    name: 'deepseek',
    label: 'DeepSeek',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    getModel: () => process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    complete: async ({ system, user, model }) => {
      const client = getOpenAICompatibleClient(
        'deepseek',
        process.env.DEEPSEEK_API_KEY,
        'https://api.deepseek.com'
      );
      return openAICompatibleComplete(client, model, { system, user });
    },
  },
};

const PROVIDER_NAMES = Object.keys(PROVIDERS);

function isConfigured(provider) {
  const key = process.env[provider.apiKeyEnv];
  return Boolean(key && key.trim() !== '');
}

/**
 * Provider par défaut (AI_PROVIDER dans .env, sinon claude)
 */
function getDefaultProviderName() {
  const name = (process.env.AI_PROVIDER || 'claude').toLowerCase().trim();
  return PROVIDERS[name] ? name : 'claude';
}

/**
 * Résoudre un nom de provider vers son adaptateur.
 * Jette une erreur explicite si le nom est inconnu ou la clé absente.
 */
function resolveProvider(providerName) {
  const name = (providerName || getDefaultProviderName()).toLowerCase().trim();

  const provider = PROVIDERS[name];
  if (!provider) {
    const err = new Error(
      `Moteur IA inconnu : "${providerName}". Valeurs possibles : ${PROVIDER_NAMES.join(', ')}`
    );
    err.code = 'UNKNOWN_PROVIDER';
    throw err;
  }

  if (!isConfigured(provider)) {
    const err = new Error(
      `Le moteur ${provider.label} n'est pas configuré (variable ${provider.apiKeyEnv} absente)`
    );
    err.code = 'PROVIDER_NOT_CONFIGURED';
    throw err;
  }

  return provider;
}

/**
 * Liste des providers avec leur disponibilité (pour l'app mobile)
 */
function listProviders() {
  const defaultName = getDefaultProviderName();
  return PROVIDER_NAMES.map((name) => {
    const provider = PROVIDERS[name];
    return {
      name,
      label: provider.label,
      model: provider.getModel(),
      available: isConfigured(provider),
      isDefault: name === defaultName,
    };
  });
}

module.exports = {
  resolveProvider,
  getDefaultProviderName,
  listProviders,
  PROVIDER_NAMES,
};
