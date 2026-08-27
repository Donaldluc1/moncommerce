// src/services/ai.service.js
const {
  resolveProvider,
  getDefaultProviderName,
  listProviders,
} = require('./llm/providers');

// Prompt système pour guider l'IA
const SYSTEM_PROMPT = `Tu es un assistant IA pour une application de gestion de commerce en Afrique francophone.

Ta mission : analyser les commandes vocales des commerçants et extraire les informations de manière structurée.

TYPES DE COMMANDES :

1️⃣ VENTE (espèces ou crédit)
Exemples :
- "Enregistre une vente de 5000 francs en espèces"
- "Vente de 3000 F à crédit pour Jean Kouassi"
- "J'ai vendu pour 2500 francs cash"
- "Marie a acheté pour 1000 francs à crédit"

2️⃣ DÉPENSE
Exemples :
- "Enregistre une dépense de 1000 francs pour le transport"
- "J'ai dépensé 500 F pour acheter des marchandises"
- "Dépense de 2000 pour l'électricité"

3️⃣ NOUVEAU CLIENT
Exemples :
- "Ajoute un nouveau client Jean Kouassi numéro 0708090102"
- "Créer client Marie Koné téléphone 0709080706"
- "Nouveau client Aya Traoré"

RÈGLES IMPORTANTES :

✅ Montants : accepter "francs", "F", "CFA", "FCFA"
✅ Mode paiement par défaut : "cash" (si non spécifié)
✅ Détecter : "espèces", "cash", "comptant" → cash
✅ Détecter : "crédit", "à crédit", "dette" → credit
✅ Pour vente à crédit : nom du client OBLIGATOIRE
✅ Extraire le motif pour les dépenses
✅ Normaliser les noms (majuscules premières lettres)

FORMAT DE RÉPONSE (JSON strict, sans markdown) :

VENTE :
{
  "type": "vente",
  "montant": 5000,
  "modePaiement": "cash",
  "nomClient": "Jean Kouassi",
  "notes": null
}

DÉPENSE :
{
  "type": "depense",
  "montant": 1000,
  "motif": "Transport",
  "categorie": "Transport"
}

NOUVEAU CLIENT :
{
  "type": "nouveau_client",
  "nom": "Jean Kouassi",
  "telephone": "0708090102",
  "adresse": null
}

ERREUR (si incompréhensible) :
{
  "type": "erreur",
  "message": "Je n'ai pas compris. Pouvez-vous reformuler ?"
}

CONSIGNES STRICTES :
- Réponds UNIQUEMENT avec du JSON valide
- Pas de \`\`\`json, pas de markdown
- Si doute sur le montant → type "erreur"
- Si vente crédit sans nom client → type "erreur" avec message explicite`;

/**
 * Extraire le JSON d'une réponse LLM.
 * Certains modèles enveloppent le JSON dans des fences markdown malgré les consignes.
 */
function extractJson(responseText) {
  let text = responseText.trim();

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  return JSON.parse(text);
}

/**
 * Analyser une commande vocale avec le moteur IA choisi
 * @param {string} textCommand - Texte transcrit de la commande vocale
 * @param {string} [providerName] - Moteur IA (claude | chatgpt | deepseek), sinon AI_PROVIDER
 */
async function analyzeVoiceCommand(textCommand, providerName) {
  let provider;
  try {
    if (!textCommand || textCommand.trim() === '') {
      return {
        type: 'erreur',
        message: 'Commande vide. Veuillez dire quelque chose.',
      };
    }

    provider = resolveProvider(providerName);
    const model = provider.getModel();

    console.log(`[IA] Analyse de: "${textCommand}" (moteur: ${provider.name}, modèle: ${model})`);

    const responseText = await provider.complete({
      system: SYSTEM_PROMPT,
      user: textCommand,
      model,
    });

    console.log('[IA] Réponse brute:', responseText);

    // Parser le JSON
    let parsed;
    try {
      parsed = extractJson(responseText);
    } catch (parseError) {
      console.error('[IA] Erreur parsing JSON:', parseError);
      return {
        type: 'erreur',
        message: 'Impossible d\'analyser la commande. Reformulez svp.',
      };
    }

    // Validation basique
    if (!parsed.type) {
      return {
        type: 'erreur',
        message: 'Format de réponse invalide.',
      };
    }

    // Traçabilité : quel moteur a réellement traité la commande
    parsed._meta = { provider: provider.name, model };

    console.log('[IA] Commande analysée:', parsed);
    return parsed;

  } catch (error) {
    console.error('[IA] Erreur:', error);

    const label = provider ? provider.label : 'IA';

    // Erreurs de configuration (provider inconnu ou clé absente)
    if (error.code === 'UNKNOWN_PROVIDER' || error.code === 'PROVIDER_NOT_CONFIGURED') {
      return {
        type: 'erreur',
        message: error.message,
      };
    }

    // Gérer les erreurs API (les SDK Anthropic et OpenAI exposent tous deux error.status)
    if (error.status === 401) {
      return {
        type: 'erreur',
        message: `Clé API ${label} invalide. Vérifiez la configuration.`,
      };
    }

    if (error.status === 402) {
      return {
        type: 'erreur',
        message: `Solde insuffisant sur le compte ${label}. Rechargez le compte.`,
      };
    }

    if (error.status === 404) {
      return {
        type: 'erreur',
        message: `Modèle introuvable chez ${label}. Vérifiez la variable de modèle dans la configuration.`,
      };
    }

    if (error.status === 429) {
      return {
        type: 'erreur',
        message: `Trop de requêtes vers ${label}. Réessayez dans quelques secondes.`,
      };
    }

    return {
      type: 'erreur',
      message: 'Erreur technique. Réessayez.',
    };
  }
}

/**
 * Valider les données extraites
 */
function validateCommand(parsedCommand) {
  const result = {
    isValid: true,
    errors: [],
    data: parsedCommand,
  };

  switch (parsedCommand.type) {
    case 'vente':
      // Montant obligatoire et > 0
      if (!parsedCommand.montant || parsedCommand.montant <= 0) {
        result.isValid = false;
        result.errors.push('Le montant doit être supérieur à 0');
      }

      // Mode paiement valide
      if (!['cash', 'credit'].includes(parsedCommand.modePaiement)) {
        result.isValid = false;
        result.errors.push('Mode de paiement invalide');
      }

      // Si crédit → nom client obligatoire
      if (parsedCommand.modePaiement === 'credit') {
        if (!parsedCommand.nomClient || parsedCommand.nomClient.trim() === '') {
          result.isValid = false;
          result.errors.push('Le nom du client est obligatoire pour une vente à crédit');
        }
      }
      break;

    case 'depense':
      // Montant obligatoire et > 0
      if (!parsedCommand.montant || parsedCommand.montant <= 0) {
        result.isValid = false;
        result.errors.push('Le montant doit être supérieur à 0');
      }

      // Motif obligatoire
      if (!parsedCommand.motif || parsedCommand.motif.trim() === '') {
        result.isValid = false;
        result.errors.push('Le motif de la dépense est obligatoire');
      }
      break;

    case 'nouveau_client':
      // Nom obligatoire
      if (!parsedCommand.nom || parsedCommand.nom.trim() === '') {
        result.isValid = false;
        result.errors.push('Le nom du client est obligatoire');
      }
      break;

    case 'erreur':
      result.isValid = false;
      result.errors.push(parsedCommand.message || 'Commande non comprise');
      break;

    default:
      result.isValid = false;
      result.errors.push('Type de commande non reconnu');
  }

  return result;
}

module.exports = {
  analyzeVoiceCommand,
  validateCommand,
  extractJson,
  listProviders,
  getDefaultProviderName,
};