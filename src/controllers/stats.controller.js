// controllers/stats.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtenir les statistiques du jour
 */
const getStatsJour = async (req, res) => {
  try {
    const userId = req.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Ventes du jour
    const ventes = await prisma.vente.findMany({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    const totalVentes = ventes.reduce((sum, v) => sum + v.montant, 0);
    const ventesCredit = ventes.filter(v => v.modePaiement === 'credit')
      .reduce((sum, v) => sum + v.montant, 0);
    const ventesCash = totalVentes - ventesCredit;

    // Dépenses du jour
    const depenses = await prisma.depense.findMany({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    const totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);

    // Bénéfice = ventes cash - dépenses
    const benefice = ventesCash - totalDepenses;

    res.json({
      date: today.toISOString().split('T')[0],
      ventes: {
        total: totalVentes,
        cash: ventesCash,
        credit: ventesCredit,
        nombre: ventes.length
      },
      depenses: {
        total: totalDepenses,
        nombre: depenses.length
      },
      benefice
    });

  } catch (error) {
    console.error('Erreur stats jour:', error);
    res.status(500).json({
      error: 'Erreur lors du calcul des statistiques'
    });
  }
};

/**
 * Obtenir les statistiques du mois
 */
const getStatsMois = async (req, res) => {
  try {
    const userId = req.userId;
    const { annee, mois } = req.query;

    // Utiliser le mois/année courant par défaut
    const today = new Date();
    const year = annee ? parseInt(annee) : today.getFullYear();
    const month = mois ? parseInt(mois) : today.getMonth() + 1;

    const dateDebut = new Date(year, month - 1, 1);
    const dateFin = new Date(year, month, 1);

    // Ventes du mois
    const ventes = await prisma.vente.findMany({
      where: {
        userId,
        date: {
          gte: dateDebut,
          lt: dateFin
        }
      }
    });

    const totalVentes = ventes.reduce((sum, v) => sum + v.montant, 0);
    const ventesCredit = ventes.filter(v => v.modePaiement === 'credit')
      .reduce((sum, v) => sum + v.montant, 0);
    const ventesCash = totalVentes - ventesCredit;

    // Dépenses du mois
    const depenses = await prisma.depense.findMany({
      where: {
        userId,
        date: {
          gte: dateDebut,
          lt: dateFin
        }
      }
    });

    const totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);

    // Bénéfice
    const benefice = ventesCash - totalDepenses;

    res.json({
      periode: `${month}/${year}`,
      ventes: {
        total: totalVentes,
        cash: ventesCash,
        credit: ventesCredit,
        nombre: ventes.length
      },
      depenses: {
        total: totalDepenses,
        nombre: depenses.length
      },
      benefice
    });

  } catch (error) {
    console.error('Erreur stats mois:', error);
    res.status(500).json({
      error: 'Erreur lors du calcul des statistiques'
    });
  }
};

/**
 * Obtenir les statistiques des crédits
 */
const getStatsCredits = async (req, res) => {
  try {
    const userId = req.userId;

    // Tous les clients avec crédit
    const clients = await prisma.client.findMany({
      where: {
        userId,
        totalCredit: { gt: 0 }
      },
      orderBy: { totalCredit: 'desc' }
    });

    const totalCredits = clients.reduce((sum, c) => sum + c.totalCredit, 0);

    res.json({
      nombreClients: clients.length,
      totalCredits,
      clients: clients.map(c => ({
        id: c.id,
        nom: c.nom,
        telephone: c.telephone,
        montantDu: c.totalCredit
      }))
    });

  } catch (error) {
    console.error('Erreur stats crédits:', error);
    res.status(500).json({
      error: 'Erreur lors du calcul des statistiques'
    });
  }
};

/**
 * Obtenir le résumé global
 */
const getResume = async (req, res) => {
  try {
    const userId = req.userId;

    // Stats du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const ventesJour = await prisma.vente.aggregate({
      where: {
        userId,
        date: { gte: today, lt: tomorrow }
      },
      _sum: { montant: true },
      _count: true
    });

    const depensesJour = await prisma.depense.aggregate({
      where: {
        userId,
        date: { gte: today, lt: tomorrow }
      },
      _sum: { montant: true }
    });

    // Total crédits en cours
    const creditsTotal = await prisma.client.aggregate({
      where: {
        userId,
        totalCredit: { gt: 0 }
      },
      _sum: { totalCredit: true },
      _count: true
    });

    res.json({
      aujourdHui: {
        ventes: ventesJour._sum.montant || 0,
        nombreVentes: ventesJour._count || 0,
        depenses: depensesJour._sum.montant || 0
      },
      credits: {
        total: creditsTotal._sum.totalCredit || 0,
        nombreClients: creditsTotal._count || 0
      }
    });

  } catch (error) {
    console.error('Erreur résumé:', error);
    res.status(500).json({
      error: 'Erreur lors du calcul du résumé'
    });
  }
};

module.exports = {
  getStatsJour,
  getStatsMois,
  getStatsCredits,
  getResume
};