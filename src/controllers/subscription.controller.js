// src/controllers/subscription.controller.js
const {
    checkAccess,
    activateSubscription,
    getSubscriptionInfo,
    renewSubscription,
    getAvailablePlans,
    calculateSavings,
  } = require('../services/subscription.service');
  
  /**
   * Vérifier l'accès de l'utilisateur
   * GET /api/subscription/check
   */
  const checkUserAccess = async (req, res) => {
    try {
      const userId = req.userId;
      const access = await checkAccess(userId);
  
      return res.json({
        success: true,
        access,
      });
    } catch (error) {
      console.error('[SUBSCRIPTION] Erreur check access:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la vérification de l\'accès',
      });
    }
  };
  
  /**
   * Obtenir les informations d'abonnement
   * GET /api/subscription/info
   */
  const getInfo = async (req, res) => {
    try {
      const userId = req.userId;
      const info = await getSubscriptionInfo(userId);
  
      if (!info) {
        return res.status(404).json({
          success: false,
          error: 'Aucun abonnement trouvé',
        });
      }
  
      return res.json({
        success: true,
        data: info,
      });
    } catch (error) {
      console.error('[SUBSCRIPTION] Erreur get info:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des informations',
      });
    }
  };
  
  /**
   * Obtenir les plans disponibles avec économies
   * GET /api/subscription/plans
   */
  const getPlans = async (req, res) => {
    try {
      const plans = getAvailablePlans();
      const savings = calculateSavings();
  
      return res.json({
        success: true,
        plans,
        savings,
      });
    } catch (error) {
      console.error('[SUBSCRIPTION] Erreur get plans:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des plans',
      });
    }
  };
  
  /**
   * Simuler un paiement et activer l'abonnement
   * POST /api/subscription/activate
   * 
   * Body: {
   *   plan: "monthly" | "quarterly" | "semesterly" | "yearly",
   *   paymentMethod: "orange_money" | "mtn_money" | "moov_money" | "wave",
   *   phoneNumber: "0708090102"
   * }
   */
  const activate = async (req, res) => {
    try {
      const userId = req.userId;
      const { plan, paymentMethod, phoneNumber } = req.body;
  
      // Validation
      if (!plan) {
        return res.status(400).json({
          success: false,
          error: 'Le plan est requis',
        });
      }
  
      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          error: 'La méthode de paiement est requise',
        });
      }
  
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'Le numéro de téléphone est requis',
        });
      }
  
      console.log(`\n=== ACTIVATION ABONNEMENT ===`);
      console.log(`User: ${userId}`);
      console.log(`Plan: ${plan}`);
      console.log(`Payment: ${paymentMethod} - ${phoneNumber}`);
  
      // SIMULATION DE PAIEMENT
      // En production, intégrer l'API réelle (FedaPay, CinetPay, etc.)
      
      // Générer un ID de transaction simulé
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`Transaction simulée: ${transactionId}`);
      
      // Activer l'abonnement
      const subscription = await activateSubscription(
        userId,
        plan,
        transactionId,
        paymentMethod
      );
  
      console.log(`✅ Abonnement activé`);
      console.log(`=============================\n`);
  
      return res.status(201).json({
        success: true,
        message: 'Abonnement activé avec succès',
        subscription,
        transactionId,
      });
  
    } catch (error) {
      console.error('[SUBSCRIPTION] Erreur activation:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de l\'activation',
      });
    }
  };
  
  /**
   * Renouveler l'abonnement
   * POST /api/subscription/renew
   */
  const renew = async (req, res) => {
    try {
      const userId = req.userId;
      const { paymentMethod, phoneNumber } = req.body;
  
      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          error: 'La méthode de paiement est requise',
        });
      }
  
      // Simulation de paiement
      const transactionId = `TXN_RENEW_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const subscription = await renewSubscription(
        userId,
        transactionId,
        paymentMethod
      );
  
      return res.status(201).json({
        success: true,
        message: 'Abonnement renouvelé avec succès',
        subscription,
        transactionId,
      });
  
    } catch (error) {
      console.error('[SUBSCRIPTION] Erreur renouvellement:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors du renouvellement',
      });
    }
  };
  
  /**
   * Webhook pour recevoir les notifications de paiement
   * POST /api/subscription/webhook
   * (Pour intégration avec FedaPay, CinetPay, etc.)
   */
  const webhook = async (req, res) => {
    try {
      console.log('[WEBHOOK] Notification de paiement reçue:', req.body);
  
      // TODO: Vérifier la signature du webhook
      // TODO: Traiter selon le provider (FedaPay, CinetPay, etc.)
      
      const { transactionId, status, userId, plan } = req.body;
  
      if (status === 'success') {
        // Activer l'abonnement
        await activateSubscription(userId, plan, transactionId, 'mobile_money');
        
        console.log(`✅ Abonnement activé via webhook pour user ${userId}`);
      }
  
      return res.json({ success: true });
  
    } catch (error) {
      console.error('[WEBHOOK] Erreur:', error);
      return res.status(500).json({ success: false });
    }
  };
  
  module.exports = {
    checkUserAccess,
    getInfo,
    getPlans,
    activate,
    renew,
    webhook,
  };