// routes/depense.routes.js
const express = require('express');
const router = express.Router();
const depenseController = require('../controllers/depense.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Toutes les routes sont protégées
router.use(authMiddleware);

router.post('/', depenseController.createDepense);
router.get('/', depenseController.getDepenses);
router.get('/:id', depenseController.getDepenseById);
router.delete('/:id', depenseController.deleteDepense);

module.exports = router;