// src/controllers/ai.controller.js
const { PrismaClient } = require('@prisma/client');
const { analyzeVoiceCommand, validateCommand } = require('../services/ai.service');

const prisma = new PrismaClient();

/**
 * Traiter une commande vocale
 * POST /api/ai/voice-command
 */
const processVoiceCommand = async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.userId; // Depuis le middleware auth

    // Validation
    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Le texte de la commande est requis',
      });
    }

    console.log(`\n=== NOUVELLE COMMANDE VOCALE ===`);
    console.log(`User ID: ${userId}`);
    console.log(`Texte: "${text}"`);

    // ÉTAPE 1 : Analyser avec l'IA
    const parsed = await analyzeVoiceCommand(text);

    // ÉTAPE 2 : Valider
    const validation = validateCommand(parsed);
    if (!validation.isValid) {
      console.log('❌ Validation échouée:', validation.errors);
      return res.status(400).json({
        success: false,
        error: validation.errors.join(', '),
        parsedData: parsed,
      });
    }

    // ÉTAPE 3 : Traiter selon le type
    let result;

    switch (parsed.type) {
      case 'vente':
        result = await handleVente(parsed, userId);
        break;

      case 'depense':
        result = await handleDepense(parsed, userId);
        break;

      case 'nouveau_client':
        result = await handleNouveauClient(parsed, userId);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Type de commande non supporté',
        });
    }

    console.log('✅ Succès:', result.message);
    console.log('================================\n');

    // Retourner le succès
    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
      parsedCommand: parsed,
    });

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.log('================================\n');

    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du traitement',
    });
  }
};

/**
 * Gérer une vente
 */
async function handleVente(parsed, userId) {
  const { montant, modePaiement, nomClient, notes } = parsed;

  let clientId = null;

  // Si vente à crédit, VÉRIFIER que le client existe
  if (modePaiement === 'credit' && nomClient) {
    console.log(`🔍 Recherche du client: "${nomClient}"`);

    // Recherche case-insensitive
    const client = await prisma.client.findFirst({
      where: {
        userId,
        nom: {
          contains: nomClient,
          mode: 'insensitive',
        },
      },
    });

    if (!client) {
      // CLIENT NON TROUVÉ → Erreur explicite
      throw new Error(
        `Le client "${nomClient}" n'existe pas dans votre base. ` +
        `Créez-le d'abord avec la commande : "Créer un nouveau client ${nomClient}"`
      );
    }

    console.log(`✅ Client trouvé: ${client.nom} (ID: ${client.id})`);
    clientId = client.id;
  }

  // Créer la vente
  const vente = await prisma.vente.create({
    data: {
      montant: parseFloat(montant),
      modePaiement,
      nomClient: nomClient || null,
      notes: notes || null,
      userId,
      clientId,
    },
    include: {
      client: true,
    },
  });

  // Si crédit, mettre à jour le total du client
  if (modePaiement === 'credit' && clientId) {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        totalCredit: {
          increment: parseFloat(montant),
        },
      },
    });
    console.log(`💳 Crédit du client mis à jour (+${montant} F)`);
  }

  return {
    message: modePaiement === 'credit'
      ? `Vente à crédit de ${montant} francs enregistrée pour ${nomClient}`
      : `Vente de ${montant} francs en espèces enregistrée`,
    data: vente,
  };
}

/**
 * Gérer une dépense
 */
async function handleDepense(parsed, userId) {
  const { montant, motif, categorie } = parsed;

  const depense = await prisma.depense.create({
    data: {
      montant: parseFloat(montant),
      motif,
      categorie: categorie || null,
      userId,
    },
  });

  return {
    message: `Dépense de ${montant} francs enregistrée pour ${motif}`,
    data: depense,
  };
}

/**
 * Gérer un nouveau client
 */
async function handleNouveauClient(parsed, userId) {
  const { nom, telephone, adresse } = parsed;

  // Vérifier si le client existe déjà
  const existingClient = await prisma.client.findFirst({
    where: {
      userId,
      nom: {
        equals: nom,
        mode: 'insensitive',
      },
    },
  });

  if (existingClient) {
    throw new Error(
      `Le client "${nom}" existe déjà dans votre base. ` +
      `Utilisez-le directement pour vos ventes à crédit.`
    );
  }

  // Créer le client
  const client = await prisma.client.create({
    data: {
      nom,
      telephone: telephone || null,
      adresse: adresse || null,
      totalCredit: 0,
      userId,
    },
  });

  return {
    message: telephone
      ? `Client ${nom} créé avec le numéro ${telephone}`
      : `Client ${nom} créé`,
    data: client,
  };
}

/**
 * Tester la connexion IA
 * GET /api/ai/test
 */
const testAI = async (req, res) => {
  try {
    const testCommand = 'Enregistre une vente de 5000 francs en espèces';
    
    console.log('[TEST IA] Commande test:', testCommand);
    const result = await analyzeVoiceCommand(testCommand);

    return res.json({
      success: true,
      message: 'Connexion IA fonctionnelle ✅',
      model: process.env.AI_MODEL,
      testCommand,
      result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Erreur de connexion à l\'IA',
      details: error.message,
    });
  }
};

module.exports = {
  processVoiceCommand,
  testAI,
};