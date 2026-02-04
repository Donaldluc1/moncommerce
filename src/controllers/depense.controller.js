// controllers/depense.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Créer une nouvelle dépense
 */
const createDepense = async (req, res) => {
  try {
    const { montant, motif, categorie, date } = req.body;
    const userId = req.userId;

    // Validation
    if (!montant || montant <= 0) {
      return res.status(400).json({
        error: 'Le montant doit être supérieur à 0'
      });
    }

    if (!motif || motif.trim() === '') {
      return res.status(400).json({
        error: 'Le motif est obligatoire'
      });
    }

    const depense = await prisma.depense.create({
      data: {
        montant: parseFloat(montant),
        motif: motif.trim(),
        categorie: categorie || null,
        date: date ? new Date(date) : new Date(),
        userId
      }
    });

    res.status(201).json({
      message: 'Dépense enregistrée',
      depense
    });

  } catch (error) {
    console.error('Erreur création dépense:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'enregistrement de la dépense'
    });
  }
};

/**
 * Obtenir toutes les dépenses de l'utilisateur
 */
const getDepenses = async (req, res) => {
  try {
    const userId = req.userId;
    const { dateDebut, dateFin, categorie, limit = 50 } = req.query;

    // Construire les filtres
    const where = { userId };

    if (dateDebut || dateFin) {
      where.date = {};
      if (dateDebut) where.date.gte = new Date(dateDebut);
      if (dateFin) where.date.lte = new Date(dateFin);
    }

    if (categorie) {
      where.categorie = categorie;
    }

    const depenses = await prisma.depense.findMany({
      where,
      orderBy: { date: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      depenses,
      total: depenses.length
    });

  } catch (error) {
    console.error('Erreur récupération dépenses:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des dépenses'
    });
  }
};

/**
 * Obtenir une dépense spécifique
 */
const getDepenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const depense = await prisma.depense.findFirst({
      where: { id, userId }
    });

    if (!depense) {
      return res.status(404).json({
        error: 'Dépense non trouvée'
      });
    }

    res.json({ depense });

  } catch (error) {
    console.error('Erreur récupération dépense:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la dépense'
    });
  }
};

/**
 * Supprimer une dépense
 */
const deleteDepense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Vérifier que la dépense appartient à l'utilisateur
    const depense = await prisma.depense.findFirst({
      where: { id, userId }
    });

    if (!depense) {
      return res.status(404).json({
        error: 'Dépense non trouvée'
      });
    }

    await prisma.depense.delete({
      where: { id }
    });

    res.json({
      message: 'Dépense supprimée'
    });

  } catch (error) {
    console.error('Erreur suppression dépense:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression de la dépense'
    });
  }
};

module.exports = {
  createDepense,
  getDepenses,
  getDepenseById,
  deleteDepense
};