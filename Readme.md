# 🚀 Backend API - Gestion Commerce MVP
google Play Link dowload: https://play.google.com/store/apps/details?id=com.meraky.moncommerce

API REST pour l'application mobile de gestion de commerce.
Nous avons rajouter une option IA de commande vocale pour etre capable de gerer tous ces elements via des commandes vocale (speech to text)

## 📋 Technologies

- **Node.js** + Express
- **Prisma** (ORM)
- **PostgreSQL** (ou SQLite pour dev)
- **JWT** pour authentification

## 🔧 Installation

### 1. Prérequis

- Node.js 18+ installé
- PostgreSQL installé (ou SQLite pour dev local)

### 2. Installation des dépendances

```bash
cd backend
npm install
```

### 3. Configuration

Copier `.env.example` vers `.env` et configurer :

```bash
cp .env.example .env
```

Éditer `.env` :

```env
# Pour PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/gestion_commerce"

# Ou pour SQLite (dev local)
DATABASE_URL="file:./dev.db"

JWT_SECRET="votre_secret_super_securise"
PORT=3000
```

### 4. Initialiser la base de données

```bash
# Générer le client Prisma
npm run prisma:generate

# Créer et appliquer les migrations
npm run prisma:migrate

# Optionnel : Ouvrir l'interface Prisma Studio
npm run prisma:studio
```

### 5. Démarrer le serveur

```bash
# Mode développement (avec auto-reload)
npm run dev

# Mode production
npm start
```

Le serveur démarre sur `http://localhost:3000`

## 📚 Documentation API

### Authentification

#### Inscription
```http
POST /api/auth/register
Content-Type: application/json

{
  "telephone": "0708090102",
  "password": "motdepasse123",
  "nomCommerce": "Boutique Koffi",
  "typeActivite": "Boutique"
}
```

#### Connexion
```http
POST /api/auth/login
Content-Type: application/json

{
  "telephone": "0708090102",
  "password": "motdepasse123"
}
```

**Réponse :**
```json
{
  "message": "Connexion réussie",
  "user": {
    "id": "uuid",
    "telephone": "0708090102",
    "nomCommerce": "Boutique Koffi"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Profil
```http
GET /api/auth/profile
Authorization: Bearer YOUR_TOKEN
```

### Ventes

#### Créer une vente
```http
POST /api/ventes
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "montant": 5000,
  "modePaiement": "cash",
  "nomClient": "Jean Kouassi",
  "notes": "2 sacs de riz"
}
```

#### Lister les ventes
```http
GET /api/ventes?limit=50&modePaiement=cash
Authorization: Bearer YOUR_TOKEN
```

#### Supprimer une vente
```http
DELETE /api/ventes/:id
Authorization: Bearer YOUR_TOKEN
```

### Dépenses

#### Créer une dépense
```http
POST /api/depenses
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "montant": 2000,
  "motif": "Achat de marchandises",
  "categorie": "Stock"
}
```

#### Lister les dépenses
```http
GET /api/depenses?limit=50
Authorization: Bearer YOUR_TOKEN
```

### Clients

#### Créer un client
```http
POST /api/clients
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "nom": "Marie Koné",
  "telephone": "0709080706"
}
```

#### Lister les clients (avec crédit)
```http
GET /api/clients?avecCredit=true
Authorization: Bearer YOUR_TOKEN
```

#### Enregistrer un paiement de crédit
```http
POST /api/clients/paiements
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "clientId": "uuid-du-client",
  "montant": 3000,
  "notes": "Paiement partiel"
}
```

### Statistiques

#### Stats du jour
```http
GET /api/stats/jour
Authorization: Bearer YOUR_TOKEN
```

**Réponse :**
```json
{
  "date": "2026-02-01",
  "ventes": {
    "total": 25000,
    "cash": 20000,
    "credit": 5000,
    "nombre": 8
  },
  "depenses": {
    "total": 12000,
    "nombre": 3
  },
  "benefice": 8000
}
```

#### Stats du mois
```http
GET /api/stats/mois?annee=2026&mois=2
Authorization: Bearer YOUR_TOKEN
```

#### Résumé global
```http
GET /api/stats/resume
Authorization: Bearer YOUR_TOKEN
```

## 🗄️ Structure de la base de données

### Tables principales

- **users** : Commerçants
- **ventes** : Ventes enregistrées
- **depenses** : Dépenses
- **clients** : Clients (surtout pour crédits)
- **paiements** : Paiements de crédit

## 🔐 Sécurité

- Tous les mots de passe sont hashés avec bcrypt
- Authentification JWT avec expiration 30 jours
- Toutes les routes sauf auth nécessitent un token
- Validation des données entrantes

## 🚀 Déploiement

### Option 1 : Railway (Recommandé)

1. Créer un compte sur [railway.app](https://railway.app)
2. Connecter votre repo GitHub
3. Ajouter une base PostgreSQL
4. Définir les variables d'environnement
5. Déployer !

### Option 2 : Render

1. Créer un compte sur [render.com](https://render.com)
2. Créer un Web Service
3. Ajouter PostgreSQL gratuit
4. Configurer les variables d'environnement
5. Déployer

### Option 3 : VPS (pour plus de contrôle)

```bash
# Sur le serveur
git clone votre-repo
cd backend
npm install
npm run prisma:migrate
npm start
```

Utiliser PM2 pour la production :
```bash
npm install -g pm2
pm2 start src/server.js --name api-commerce
pm2 save
pm2 startup
```

## 📝 Notes importantes

- Le token JWT expire après 30 jours
- Les crédits sont automatiquement calculés
- Les statistiques sont calculées en temps réel
- Aucune donnée sensible n'est loggée

## 🐛 Debugging

Activer les logs Prisma :
```env
DEBUG=prisma:query
```

## 🔄 Migrations

Créer une nouvelle migration :
```bash
npx prisma migrate dev --name nom_migration
```

Réinitialiser la base :
```bash
npx prisma migrate reset
```