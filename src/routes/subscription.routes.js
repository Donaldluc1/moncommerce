// src/routes/subscription.routes.js
const express = require('express');
const router = express.Router();
const {
  checkUserAccess,
  getInfo,
  getPlans,
  activate,
  renew,
  webhook,
} = require('../controllers/subscription.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Routes publiques
router.post('/webhook', webhook); // Webhook de paiement (sans auth)

// Routes protégées (nécessitent authentification)
router.use(authMiddleware);

// GET /api/subscription/check - Vérifier l'accès
router.get('/check', checkUserAccess);

// GET /api/subscription/info - Infos abonnement
router.get('/info', getInfo);

// GET /api/subscription/plans - Plans disponibles
router.get('/plans', getPlans);

// POST /api/subscription/activate - Activer un abonnement
router.post('/activate', activate);

// POST /api/subscription/renew - Renouveler
router.post('/renew', renew);

module.exports = router;