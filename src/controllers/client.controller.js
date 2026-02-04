// controllers/client.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Créer un nouveau client
 */
const createClient = async (req, res) => {
  try {
    const { nom, telephone, adresse } = req.body;
    const userId = req.userId;

    // Validation
    if (!nom || nom.trim() === '') {
      return res.status(400).json({
        error: 'Le nom du client est obligatoire'
      });
    }

    const client = await prisma.client.create({
      data: {
        nom: nom.trim(),
        telephone: telephone || null,
        adresse: adresse || null,
        totalCredit: 0,
        userId
      }
    });

    res.status(201).json({
      message: 'Client créé',
      client
    });

  } catch (error) {
    console.error('Erreur création client:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du client'
    });
  }
};

/**
 * Obtenir tous les clients
 */
const getClients = async (req, res) => {
  try {
    const userId = req.userId;
    const { avecCredit } = req.query;

    const where = { userId };

    // Filtrer uniquement les clients avec crédit
    if (avecCredit === 'true') {
      where.totalCredit = { gt: 0 };
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        ventes: {
          where: { modePaiement: 'credit' },
          orderBy: { date: 'desc' }
        },
        paiements: {
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { totalCredit: 'desc' }
    });

    res.json({
      clients,
      total: clients.length
    });

  } catch (error) {
    console.error('Erreur récupération clients:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des clients'
    });
  }
};

/**
 * Obtenir un client spécifique avec son historique
 */
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const client = await prisma.client.findFirst({
      where: { id, userId },
      include: {
        ventes: {
          where: { modePaiement: 'credit' },
          orderBy: { date: 'desc' }
        },
        paiements: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!client) {
      return res.status(404).json({
        error: 'Client non trouvé'
      });
    }

    res.json({ client });

  } catch (error) {
    console.error('Erreur récupération client:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du client'
    });
  }
};

/**
 * Enregistrer un paiement de crédit
 */
const createPaiement = async (req, res) => {
  try {
    const { clientId, montant, notes } = req.body;
    const userId = req.userId;

    // Validation
    if (!clientId || !montant || montant <= 0) {
      return res.status(400).json({
        error: 'Client et montant valide requis'
      });
    }

    // Vérifier que le client appartient à l'utilisateur
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId }
    });

    if (!client) {
      return res.status(404).json({
        error: 'Client non trouvé'
      });
    }

    // Vérifier que le montant ne dépasse pas le crédit
    if (parseFloat(montant) > client.totalCredit) {
      return res.status(400).json({
        error: 'Le montant dépasse le crédit du client'
      });
    }

    // Créer le paiement
    const paiement = await prisma.paiement.create({
      data: {
        montant: parseFloat(montant),
        notes: notes || null,
        clientId
      }
    });

    // Mettre à jour le total crédit du client
    await prisma.client.update({
      where: { id: clientId },
      data: {
        totalCredit: {
          decrement: parseFloat(montant)
        }
      }
    });

    // Récupérer le client mis à jour
    const updatedClient = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        paiements: {
          orderBy: { date: 'desc' },
          take: 5
        }
      }
    });

    res.status(201).json({
      message: 'Paiement enregistré',
      paiement,
      client: updatedClient
    });

  } catch (error) {
    console.error('Erreur création paiement:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'enregistrement du paiement'
    });
  }
};

/**
 * Supprimer un client
 */
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Vérifier que le client appartient à l'utilisateur
    const client = await prisma.client.findFirst({
      where: { id, userId }
    });

    if (!client) {
      return res.status(404).json({
        error: 'Client non trouvé'
      });
    }

    // Vérifier qu'il n'a pas de crédit en cours
    if (client.totalCredit > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer un client avec un crédit en cours'
      });
    }

    await prisma.client.delete({
      where: { id }
    });

    res.json({
      message: 'Client supprimé'
    });

  } catch (error) {
    console.error('Erreur suppression client:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du client'
    });
  }
};

module.exports = {
  createClient,
  getClients,
  getClientById,
  createPaiement,
  deleteClient
};