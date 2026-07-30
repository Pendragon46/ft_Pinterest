# Test de démarrage à froid (S6)

> **But.** Reproduire le **tout premier geste de l'évaluateur** : cloner le dépôt
> sur une machine vierge et lancer le projet. Si ça ne boote pas, ou si le canvas
> est vide, le reste de l'évaluation ne se fait pas.
>
> État vérifié le **2026-07-28** sur `srabeman/integration`. Coche chaque case.

---

## 0. Pré-requis de dépôt — état vérifié

- [x] **Assets de seed trackés (résolu).** `seed-network.mjs`, `seed-data/` (les
      manifestes) et les **225 images** de `seed/` sont désormais dans git
      (commit `c529b8d`). `make seed` reproduit le réseau **18 auteurs / 224
      œuvres** sur un clone neuf. *(Vérif : `git ls-files seed-data seed-network.mjs`
      non vide ; `git ls-files seed/ | wc -l` = 225.)*

- [ ] **Secrets à recréer (normal, jamais committés).** `.env` (racine),
      `backend/.env`, `frontend/.env` sont gitignorés. Le clone neuf **doit** les
      recréer depuis les `.env.example` (voir §2), sinon le compose ne boote pas
      (`${POSTGRES_*}` / `${GRAFANA_*}` non résolus).

- [ ] **PAT GitHub dans l'URL du remote** (`git remote -v`). À **révoquer** sur
      GitHub avant tout partage du dépôt (ticket S7).

> Repli seed si besoin : `seed-atlaas.mjs` (tracké, auto-suffisant, 6 comptes +
> ~96 œuvres) reste disponible — `node seed-atlaas.mjs` — au cas où
> `seed-network.mjs` poserait souci.

---

## 1. Prérequis machine

- [ ] **Docker** (rootless OK) + **Docker Compose v2** (`docker compose version`)
- [ ] **Node 18+** sur l'hôte (`node -v`) — requis par `make seed`
- [ ] **openssl** (`openssl version`) — requis par `make certs`
- [ ] **make**, **git**, **curl**
- [ ] Ports libres : **8443** (HTTPS), **8080** (redirect), **3000** (Grafana),
      **9090/9093** (Prometheus/Alertmanager)

---

## 2. Préparation (pré-vol)

### 2.1 Environnement propre

Deux niveaux de fidélité :

- [ ] **Minimal** : cloner dans un **dossier neuf** (n'écrase pas ton install
      actuelle) et créer des `.env` frais.
- [ ] **Maximal** (fidèle à l'évaluateur) : `docker system prune -af` **puis**
      clone frais. ⚠️ Destructif : supprime toutes les images Docker en cache.

```bash
cd /tmp && rm -rf coldstart && git clone <URL_DU_DEPOT> coldstart && cd coldstart
```

### 2.2 Créer les 3 fichiers `.env` depuis les templates

- [ ] **Racine** (`${POSTGRES_*}`, `${GRAFANA_*}` du compose) :
```bash
cp .env.example .env
```
- [ ] **Backend** (DB, JWT, **Cloudinary**, Google OAuth) :
```bash
cp backend/.env.example backend/.env
```
- [ ] **Frontend** (`VITE_API_URL`) :
```bash
cp frontend/.env.example frontend/.env
```

### 2.3 Renseigner les vraies valeurs

- [ ] `backend/.env` → `DATABASE_URL` cohérent avec le `.env` racine
      (`postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>`)
- [ ] `backend/.env` → **`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` valides**
      (sinon les uploads de seed échouent — voir §4)
- [ ] `backend/.env` → `JWT_SECRET` non vide
- [ ] `frontend/.env` → `VITE_API_URL=https://localhost:8443/api`
- [ ] `.env` racine → `POSTGRES_*` + `GRAFANA_ADMIN_*` renseignés

---

## 3. Test — Phase 1 : `make start`

```bash
make start
```

Cette cible enchaîne : `certs` (génère le cert TLS auto-signé), `build`, puis
`docker compose up -d --build`.

**Vérifications :**

- [ ] `make certs` a créé `nginx/ssl/nginx.key` + `nginx.crt` (première fois)
- [ ] Le build se termine **sans erreur**
- [ ] Les **10 conteneurs** sont montés :
```bash
docker compose ps
```
  Attendu : `postgres, backend, frontend, nginx, prometheus, grafana,
  alertmanager, node_exporter, postgres_exporter, backup` — tous **`Up (healthy)`**
- [ ] Aucun conteneur en `Restarting` / `Exited`
- [ ] **HTTPS répond** (cert auto-signé → `-k`) :
```bash
curl -sk https://localhost:8443/ -o /dev/null -w "home %{http_code}\n"      # attendu 200
curl -s  http://localhost:8080/ -o /dev/null -w "redirect %{http_code}\n"    # attendu 301
```
- [ ] **API santé** :
```bash
curl -sk https://localhost:8443/api/health -o /dev/null -w "%{http_code}\n"  # attendu 200
```
- [ ] Backend démarré proprement :
```bash
docker logs ft_pinterest_backend --tail 20 | grep -i "successfully started"
```
- [ ] **Migrations appliquées** (schéma présent) :
```bash
docker exec ft_pinterest_postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> -tAc \
  "select count(*) from information_schema.tables where table_schema='public';"
```

À ce stade : l'app tourne mais **le canvas est vide** (aucune œuvre). C'est normal
avant le seed.

---

## 4. Test — Phase 2 : `make seed`

> Nécessite Cloudinary valide (les images sont poussées sur Cloudinary) et Node 18+.

```bash
make seed
```

**Vérifications :**

- [ ] Le script se termine sans « Fatal » ; bilan `X publiées / 0 (ou peu) échecs`
- [ ] **Comptes créés** (login live) :
```bash
curl -sk https://localhost:8443/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"tsiory_rakoto@atlaas.local","password":"Atlaas!2026-tsiory_rakoto"}' \
  -o /dev/null -w "login %{http_code}\n"    # attendu 200 (option A)
```
- [ ] **Œuvres en base** > 0 :
```bash
docker exec ft_pinterest_postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> -tAc \
  'select count(*) from "Artwork";'
```
- [ ] **Chaque auteur a ≥ 1 œuvre** (aucune ligne renvoyée = OK) :
```bash
docker exec ft_pinterest_postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> -tAc \
  'select u.username from "User" u left join "Artwork" a on a."authorId"=u.id where a.id is null;'
```
- [ ] **Follows créés** (mutuels + sens unique) :
```bash
docker exec ft_pinterest_postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> -tAc \
  'select count(*) from "Follow";'
```
- [ ] **Cloudinary joignable** (si des uploads échouent) :
```bash
docker exec ft_pinterest_backend sh -c \
  'curl -s -o /dev/null -w "cloudinary %{http_code}\n" -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET" \
   "https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME/ping"'   # attendu 200
```

---

## 5. Test — Phase 3 : parcours fonctionnel (navigateur)

Ouvre **https://localhost:8443** (accepte le certificat auto-signé).

- [ ] Le **canvas** affiche des œuvres (images visibles, pas de cadres cassés)
- [ ] **Recherche** : taper `portrait` → suggestions (niches / tags / créateurs) ;
      cliquer un **tag** ouvre ses œuvres, un **créateur** ouvre son univers
- [ ] **Zoom arrière** jusqu'à l'easter egg (mosaïque de marque)
- [ ] **Connexion** avec un compte de seed → redirection canvas
- [ ] **Messagerie** : entre 2 comptes **mutuels** la conversation s'ouvre ;
      entre non-mutuels elle est **bloquée (403)** — c'est voulu
- [ ] **3 langues** (FR / EN / **AR** en RTL) via le sélecteur — pas de clé brute
- [ ] **`/privacy`, `/terms`** s'affichent, liens du footer OK
- [ ] **Console navigateur** ouverte : **0 error / 0 warning** applicatif
      (critère de rejet 42 — voir `CONSOLE_CLEAN_SPEC.md`)
- [ ] **Grafana** : http://localhost:3000 (admin / valeur de `GRAFANA_ADMIN_PASSWORD`)

---

## 6. Critères PASS / FAIL

**PASS si :**
- [ ] `make start` monte 10/10 conteneurs healthy, HTTPS 200, redirect 301
- [ ] `make seed` peuple la base ; chaque auteur ≥ 1 œuvre ; images visibles
- [ ] Parcours navigateur sans erreur console, 3 langues OK, chat gaté correctement

**FAIL si l'un de ces symptômes apparaît :**
- Un conteneur `Restarting` (souvent : `.env` manquant / `${VAR}` non résolue)
- Canvas vide après seed (souvent : `make seed` a échoué — assets non trackés §0)
- Images en cadres cassés (souvent : Cloudinary invalide dans `backend/.env`)
- 4xx/5xx sur une action légitime, ou erreurs console

---

## 7. Dépannage rapide

| Symptôme | Cause probable | Correctif |
|---|---|---|
| `nginx` ou `backend` en `Restarting` | `.env` (racine/backend/frontend) manquant ou `${VAR}` non résolue | Recréer les 3 `.env` depuis les `.env.example` (§2) |
| `make seed: command not found node` | Node absent de l'hôte | Installer Node 18+ |
| `make seed` : `Manifeste introuvable` | `seed-data/` absent (ne devrait plus arriver) | Vérifier `git ls-files seed-data` ; sinon repli `node seed-atlaas.mjs` |
| Uploads seed en échec (`Failed to create artwork`) | Cloudinary invalide | Corriger `CLOUDINARY_*` dans `backend/.env`, `docker compose up -d --force-recreate backend`, relancer `make seed` |
| Cert TLS absent → nginx échoue | `make certs` non joué | `make certs` puis `make start` |
| Login seed en 401 | Mauvais mot de passe / seed non joué | Motif : `Atlaas!2026-<username>` (option A) |
| Grafana : mauvais identifiants | `GRAFANA_ADMIN_*` non renseignés | Renseigner dans `.env` racine, recréer le conteneur grafana |

---

## 8. Nettoyage après test

```bash
make stop            # arrête la stack (garde les volumes)
# ou, pour tout supprimer (volumes inclus) :
make fclean
cd /tmp && rm -rf coldstart
```

---

*Le seul geste que ce document ne peut pas automatiser est le §5 (navigateur, tes
yeux). Les assets de seed sont désormais trackés (§0), donc `make start && make
seed` doit passer de bout en bout sur un clone neuf — reste à le prouver sur une
vraie machine vierge.*
