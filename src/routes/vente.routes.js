// routes/vente.routes.js
const express = require('express');
const router = express.Router();
const venteController = require('../controllers/vente.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Toutes les routes sont protégées
router.use(authMiddleware);

router.post('/', venteController.createVente);
router.get('/', venteController.getVentes);
router.get('/:id', venteController.getVenteById);
router.delete('/:id', venteController.deleteVente);

module.exports = router;