# Déploiement — backend gestion-commerce

Canonique du déploiement de ce repo. Production : conteneur Docker sur le serveur,
déployé automatiquement par GitHub Actions à chaque merge sur `main`.

---

## Invariants de production (ne pas modifier)

| Élément | Valeur | Origine |
|---|---|---|
| Nom de l'image Docker | `app_commerce_backend` | nom historique sur le serveur |
| Nom du conteneur | `app_commerce_backend` | idem |
| Port publié | `3002:3002` | l'app mobile et nginx pointent dessus |
| Volumes montés | **aucun** (`Mounts: []`) | le code vit dans l'image, comme avant |
| Base de données | `gestion_commerce` sur `147.93.95.216:5433` | conteneur `postgres_service` existant, **non géré par ce déploiement** |

Tant que ces invariants tiennent, l'URL publique ne change jamais.

## Fichiers

```
Dockerfile                               # image (node:20-slim + Prisma)
.dockerignore                            # exclut .env et node_modules de l'image
docker-compose.yml                       # noms/port/restart figés
deploy/remote-deploy.sh                  # script exécuté sur le serveur
.github/workflows/deploy-backend.yml     # pipeline GitHub Actions
```

Flux : push/merge sur `main` → rsync du code vers le serveur
(`/home/meraky/apps/app_commerce_backend`) → build de l'image **sur le serveur**
(aucun registry : le nom d'image reste exactement `app_commerce_backend`) →
recréation du conteneur → attente du healthcheck HTTP.
Les pushs ne touchant que des `.md` ne déclenchent pas de déploiement.

## Mise en place initiale (une seule fois)

### a) Clé SSH de déploiement (sur votre machine)

```bash
ssh-keygen -t ed25519 -f deploy_key_app_commerce -C "github-actions-app-commerce" -N ""
```

Ajouter `deploy_key_app_commerce.pub` dans `~/.ssh/authorized_keys` du serveur.

### b) Secrets GitHub (repo → Settings → Secrets and variables → Actions)

| Secret | Contenu |
|---|---|
| `SSH_HOST` | adresse du serveur |
| `SSH_USER` | utilisateur SSH (celui qui a les droits docker) |
| `SSH_PRIVATE_KEY` | contenu de `deploy_key_app_commerce` (la clé privée) |

### c) `.env` de production sur le serveur — ⚠️ AVANT le premier déploiement

L'ancienne image embarquait son `.env` ; le premier build va écraser le tag.
Récupérer la configuration actuelle **d'abord** (la sortie contient des secrets :
ne la coller nulle part) :

```bash
docker run --rm --entrypoint sh app_commerce_backend -c 'cat .env'
```

Puis créer le fichier sur le serveur :

```bash
mkdir -p /home/meraky/apps/app_commerce_backend
nano /home/meraky/apps/app_commerce_backend/.env
```

Contenu (reprendre les **valeurs actuellement en service**, pas d'invention) :

```env
DATABASE_URL="postgresql://<UTILISATEUR_ACTUEL>:<MOT_DE_PASSE_ACTUEL>@147.93.95.216:5433/gestion_commerce"
JWT_SECRET="<REPRENDRE_LE_SECRET_ACTUEL>"
PORT=3002
NODE_ENV=production
# IA — liste complète des variables : .env.example
AI_PROVIDER="claude"
ANTHROPIC_API_KEY="<CLE_ANTHROPIC>"
AI_MODEL="claude-opus-5"
OPENAI_API_KEY=""
DEEPSEEK_API_KEY=""
```

> ⚠️ **`JWT_SECRET` doit rester identique à celui en service** : le changer invaliderait
> les sessions de tous les utilisateurs de l'app mobile.
> Le `.env` n'est jamais commité ni copié dans l'image ; le déploiement le préserve
> (rsync l'exclut explicitement).

## Déployer

- **Automatique** : merge/push sur `main`.
- **Manuel** : onglet Actions → « Deploy backend » → *Run workflow*.
- **Sur le serveur (secours)** :
  ```bash
  cd /home/meraky/apps/app_commerce_backend && bash deploy/remote-deploy.sh
  ```

Vérification externe après déploiement (port réel, pas de ping) :

```bash
curl -fsS http://147.93.95.216:3002/
```

## Rollback

Revenir au commit précédent puis laisser le pipeline redéployer :

```bash
git revert <commit_fautif> && git push origin main
```

(ou Actions → « Deploy backend » → *Run workflow* depuis l'ancien commit.)

## Écart délibéré vs l'ancien conteneur

L'ancienne image embarquait le `.env` (secrets dans l'image). Désormais le `.env` vit
uniquement sur le serveur et est injecté au démarrage (`env_file`). Comportement
identique, exposition des secrets en moins. Autre ajout : `restart: unless-stopped`
(l'ancien conteneur ne redémarrait pas après un reboot serveur).

**Améliorations futures possibles (non faites, hors invariants)** : joindre PostgreSQL
par le réseau Docker interne plutôt que par l'IP publique:5433 ; politique de
redémarrage sur `postgres_service` lui-même.

---

**Version** : 1.0 — première mise en place (Docker + GitHub Actions, build sur serveur)  
**Date** : 2026-08-27
