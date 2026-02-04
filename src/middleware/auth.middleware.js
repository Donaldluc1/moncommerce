// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

/**
 * Middleware pour vérifier le token JWT
 */
const authMiddleware = (req, res, next) => {
  try {
    // Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Token manquant. Veuillez vous connecter.' 
      });
    }

    // Format attendu: "Bearer TOKEN"
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Format de token invalide' 
      });
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ajouter l'ID utilisateur à la requête
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expiré. Veuillez vous reconnecter.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token invalide' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Erreur d\'authentification' 
    });
  }
};

module.exports = authMiddleware;