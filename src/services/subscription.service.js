// src/services/subscription.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Plans disponibles (prix en FCFA)
const PLANS = {
  monthly: {
    name: 'Mensuel',
    amount: 2000,
    durationDays: 30,
    description: '1 mois d\'accès',
  },
  quarterly: {
    name: 'Trimestriel',
    amount: 5000,
    durationDays: 90,
    description: '3 mois d\'accès',
    savings: 1000, // Économie vs 3x mensuel
  },
  semesterly: {
    name: 'Semestriel',
    amount: 10000,
    durationDays: 180,
    description: '6 mois d\'accès',
    savings: 2000, // Économie vs 6x mensuel
  },
  yearly: {
    name: 'Annuel',
    amount: 20000,
    durationDays: 365,
    description: '1 an d\'accès',
    savings: 4000, // Économie vs 12x mensuel
    popular: true,
  },
};

/**
 * Créer un abonnement d'essai pour un nouvel utilisateur (72h)
 */
async function createTrialSubscription(userId) {
  const now = new Date();
  const trialEndDate = new Date(now.getTime() + 72 * 60 * 60 * 1000); // +72 heures

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      trialStartDate: now,
      trialEndDate,
      status: 'trial',
    },
  });

  console.log(`✅ [SUBSCRIPTION] Essai 72h créé pour user ${userId}`);
  console.log(`   Expire le: ${trialEndDate.toLocaleString('fr-FR')}`);
  
  return subscription;
}

/**
 * Vérifier si un utilisateur a accès à l'application
 */
async function checkAccess(userId) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return {
      hasAccess: false,
      reason: 'no_subscription',
      message: 'Aucun abonnement trouvé',
    };
  }

  const now = new Date();

  // CAS 1: Période d'essai
  if (subscription.status === 'trial') {
    const trialEnd = new Date(subscription.trialEndDate);
    
    if (now < trialEnd) {
      // Essai encore valide
      const msLeft = trialEnd - now;
      const hoursLeft = Math.ceil(msLeft / (1000 * 60 * 60));
      
      return {
        hasAccess: true,
        status: 'trial',
        hoursLeft,
        expiresAt: trialEnd,
        message: `Essai gratuit - ${hoursLeft}h restantes`,
      };
    } else {
      // Essai expiré → mettre à jour le statut
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'expired' },
      });
      
      return {
        hasAccess: false,
        reason: 'trial_expired',
        message: 'Période d\'essai de 72h expirée. Veuillez souscrire à un abonnement.',
      };
    }
  }

  // CAS 2: Abonnement actif
  if (subscription.status === 'active') {
    const periodEnd = new Date(subscription.currentPeriodEnd);
    
    if (now < periodEnd) {
      // Abonnement valide
      const msLeft = periodEnd - now;
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      
      return {
        hasAccess: true,
        status: 'active',
        plan: subscription.plan,
        planName: PLANS[subscription.plan]?.name,
        daysLeft,
        expiresAt: periodEnd,
        message: `Abonnement ${PLANS[subscription.plan]?.name} actif - ${daysLeft} jours restants`,
      };
    } else {
      // Abonnement expiré → mettre à jour
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'expired' },
      });
      
      return {
        hasAccess: false,
        reason: 'subscription_expired',
        message: 'Votre abonnement a expiré. Veuillez le renouveler.',
      };
    }
  }

  // CAS 3: Statut expiré ou annulé
  return {
    hasAccess: false,
    reason: subscription.status,
    message: subscription.status === 'expired' 
      ? 'Abonnement expiré. Veuillez renouveler.' 
      : 'Abonnement annulé.',
  };
}

/**
 * Activer un abonnement payant
 */
async function activateSubscription(userId, plan, transactionId, paymentMethod) {
  // Validation du plan
  if (!PLANS[plan]) {
    throw new Error(`Plan invalide: ${plan}. Plans disponibles: ${Object.keys(PLANS).join(', ')}`);
  }

  const planDetails = PLANS[plan];
  const now = new Date();
  const periodEnd = new Date(now.getTime() + planDetails.durationDays * 24 * 60 * 60 * 1000);

  const subscription = await prisma.subscription.update({
    where: { userId },
    data: {
      status: 'active',
      plan,
      amount: planDetails.amount,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      paymentMethod,
      transactionId,
      lastPaymentDate: now,
      lastPaymentAmount: planDetails.amount,
    },
  });

  console.log(`✅ [SUBSCRIPTION] Activé pour user ${userId}`);
  console.log(`   Plan: ${planDetails.name} (${planDetails.amount} F)`);
  console.log(`   Valide jusqu'au: ${periodEnd.toLocaleString('fr-FR')}`);
  console.log(`   Transaction: ${transactionId}`);

  return subscription;
}

/**
 * Obtenir les informations complètes d'abonnement
 */
async function getSubscriptionInfo(userId) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return null;
  }

  const access = await checkAccess(userId);

  return {
    subscription,
    access,
    availablePlans: PLANS,
  };
}

/**
 * Renouveler un abonnement avec le même plan
 */
async function renewSubscription(userId, transactionId, paymentMethod) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription || !subscription.plan) {
    throw new Error('Aucun plan d\'abonnement précédent trouvé');
  }

  // Réactiver avec le même plan
  return activateSubscription(userId, subscription.plan, transactionId, paymentMethod);
}

/**
 * Obtenir tous les plans disponibles
 */
function getAvailablePlans() {
  return PLANS;
}

/**
 * Calculer les économies pour chaque plan
 */
function calculateSavings() {
  const monthly = PLANS.monthly.amount;
  
  return {
    quarterly: {
      ...PLANS.quarterly,
      monthlyEquivalent: (PLANS.quarterly.amount / 3).toFixed(0),
      savings: (monthly * 3 - PLANS.quarterly.amount),
      savingsPercent: Math.round(((monthly * 3 - PLANS.quarterly.amount) / (monthly * 3)) * 100),
    },
    semesterly: {
      ...PLANS.semesterly,
      monthlyEquivalent: (PLANS.semesterly.amount / 6).toFixed(0),
      savings: (monthly * 6 - PLANS.semesterly.amount),
      savingsPercent: Math.round(((monthly * 6 - PLANS.semesterly.amount) / (monthly * 6)) * 100),
    },
    yearly: {
      ...PLANS.yearly,
      monthlyEquivalent: (PLANS.yearly.amount / 12).toFixed(0),
      savings: (monthly * 12 - PLANS.yearly.amount),
      savingsPercent: Math.round(((monthly * 12 - PLANS.yearly.amount) / (monthly * 12)) * 100),
    },
  };
}

module.exports = {
  PLANS,
  createTrialSubscription,
  checkAccess,
  activateSubscription,
  getSubscriptionInfo,
  renewSubscription,
  getAvailablePlans,
  calculateSavings,
};