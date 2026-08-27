// src/routes/ai.routes.js
const express = require('express');
const router = express.Router();
const { processVoiceCommand, testAI, listAIProviders } = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// POST /api/ai/voice-command - Traiter une commande vocale
router.post('/voice-command', processVoiceCommand);

// GET /api/ai/providers - Lister les moteurs IA disponibles
router.get('/providers', listAIProviders);

// GET /api/ai/test - Tester la connexion IA
router.get('/test', testAI);

module.exports = router;