// controllers/vente.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Créer une nouvelle vente
 */
const createVente = async (req, res) => {
  try {
    const { montant, modePaiement, nomClient, notes, clientId } = req.body;
    const userId = req.userId;

    // Validation
    if (!montant || montant <= 0) {
      return res.status(400).json({
        error: 'Le montant doit être supérieur à 0'
      });
    }

    if (!['cash', 'credit'].includes(modePaiement)) {
      return res.status(400).json({
        error: 'Mode de paiement invalide (cash ou credit)'
      });
    }

    // Créer la vente
    const vente = await prisma.vente.create({
      data: {
        montant: parseFloat(montant),
        modePaiement,
        nomClient: nomClient || null,
        notes: notes || null,
        userId,
        clientId: clientId || null
      },
      include: {
        client: true
      }
    });

    // Si c'est un crédit, mettre à jour le total du client
    if (modePaiement === 'credit' && clientId) {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          totalCredit: {
            increment: parseFloat(montant)
          }
        }
      });
    }

    res.status(201).json({
      message: 'Vente enregistrée',
      vente
    });

  } catch (error) {
    console.error('Erreur création vente:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'enregistrement de la vente'
    });
  }
};

/**
 * Obtenir toutes les ventes de l'utilisateur
 */
const getVentes = async (req, res) => {
  try {
    const userId = req.userId;
    const { dateDebut, dateFin, modePaiement, limit = 50 } = req.query;

    // Construire les filtres
    const where = { userId };

    if (dateDebut || dateFin) {
      where.date = {};
      if (dateDebut) where.date.gte = new Date(dateDebut);
      if (dateFin) where.date.lte = new Date(dateFin);
    }

    if (modePaiement) {
      where.modePaiement = modePaiement;
    }

    const ventes = await prisma.vente.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            telephone: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      ventes,
      total: ventes.length
    });

  } catch (error) {
    console.error('Erreur récupération ventes:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des ventes'
    });
  }
};

/**
 * Obtenir une vente spécifique
 */
const getVenteById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const vente = await prisma.vente.findFirst({
      where: { id, userId },
      include: {
        client: true
      }
    });

    if (!vente) {
      return res.status(404).json({
        error: 'Vente non trouvée'
      });
    }

    res.json({ vente });

  } catch (error) {
    console.error('Erreur récupération vente:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la vente'
    });
  }
};

/**
 * Supprimer une vente
 */
const deleteVente = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Vérifier que la vente appartient à l'utilisateur
    const vente = await prisma.vente.findFirst({
      where: { id, userId }
    });

    if (!vente) {
      return res.status(404).json({
        error: 'Vente non trouvée'
      });
    }

    // Si c'était un crédit, déduire du total client
    if (vente.modePaiement === 'credit' && vente.clientId) {
      await prisma.client.update({
        where: { id: vente.clientId },
        data: {
          totalCredit: {
            decrement: vente.montant
          }
        }
      });
    }

    // Supprimer la vente
    await prisma.vente.delete({
      where: { id }
    });

    res.json({
      message: 'Vente supprimée'
    });

  } catch (error) {
    console.error('Erreur suppression vente:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression de la vente'
    });
  }
};

module.exports = {
  createVente,
  getVentes,
  getVenteById,
  deleteVente
};