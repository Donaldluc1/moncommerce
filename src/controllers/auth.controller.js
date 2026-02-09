// controllers/auth.controller.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createTrialSubscription } = require('../services/subscription.service');

const prisma = new PrismaClient();

/**
 * Inscription d'un nouveau commerçant
 */
const register = async (req, res) => {
  try {
    const { telephone, email, password, nomCommerce, typeActivite } = req.body;

    // Validation basique
    if (!telephone || !password || !nomCommerce) {
      return res.status(400).json({
        error: 'Téléphone, mot de passe et nom du commerce sont obligatoires'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { telephone }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Ce numéro de téléphone est déjà utilisé'
      });
    }

    // Vérifier l'email s'il est fourni
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      });

      if (existingEmail) {
        return res.status(400).json({
          error: 'Cet email est déjà utilisé'
        });
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        telephone,
        email: email || null,
        password: hashedPassword,
        nomCommerce,
        typeActivite: typeActivite || null
      }
    });

    // Créer l'abonnement trial (72h gratuit)
    await createTrialSubscription(user.id);

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' } // Token valide 30 jours
    );

    // Retourner les infos (sans le mot de passe)
    res.status(201).json({
      message: 'Compte créé avec succès',
      user: {
        id: user.id,
        telephone: user.telephone,
        email: user.email,
        nomCommerce: user.nomCommerce,
        typeActivite: user.typeActivite
      },
      token
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du compte'
    });
  }
};

/**
 * Connexion d'un commerçant
 */
const login = async (req, res) => {
  try {
    const { telephone, password } = req.body;

    // Validation
    if (!telephone || !password) {
      return res.status(400).json({
        error: 'Téléphone et mot de passe requis'
      });
    }

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { telephone }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Téléphone ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Téléphone ou mot de passe incorrect'
      });
    }

    // Générer le token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        telephone: user.telephone,
        email: user.email,
        nomCommerce: user.nomCommerce,
        typeActivite: user.typeActivite
      },
      token
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      error: 'Erreur lors de la connexion'
    });
  }
};

/**
 * Obtenir le profil de l'utilisateur connecté
 */
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        telephone: true,
        email: true,
        nomCommerce: true,
        typeActivite: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Erreur profil:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du profil'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile
};