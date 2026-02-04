// routes/stats.routes.js
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Toutes les routes sont protégées
router.use(authMiddleware);

router.get('/jour', statsController.getStatsJour);
router.get('/mois', statsController.getStatsMois);
router.get('/credits', statsController.getStatsCredits);
router.get('/resume', statsController.getResume);

module.exports = router;