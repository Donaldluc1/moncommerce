// server.js - Point d'entrée de l'API
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const venteRoutes = require('./routes/vente.routes');
const depenseRoutes = require('./routes/depense.routes');
const clientRoutes = require('./routes/client.routes');
const statsRoutes = require('./routes/stats.routes');
const aiRoutes = require('./routes/ai.routes');
const subscriptionRoutes = require('./routes/subscription.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging simple
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'API Gestion Commerce - MVP',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      ventes: '/api/ventes',
      depenses: '/api/depenses',
      clients: '/api/clients',
      stats: '/api/stats'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/ventes', venteRoutes);
app.use('/api/depenses', depenseRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur'
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
});

module.exports = app;