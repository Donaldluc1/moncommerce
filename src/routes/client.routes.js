// routes/client.routes.js
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Toutes les routes sont protégées
router.use(authMiddleware);

// Gestion des clients
router.post('/', clientController.createClient);
router.get('/', clientController.getClients);
router.get('/:id', clientController.getClientById);
router.delete('/:id', clientController.deleteClient);

// Paiements de crédit
router.post('/paiements', clientController.createPaiement);

module.exports = router;