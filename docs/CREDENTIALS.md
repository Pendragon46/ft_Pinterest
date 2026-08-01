# Comptes de démonstration — Atlaas

> **Comptes de développement / démo** générés par `make seed` (`seed-network.mjs`).
> Tous les comptes locaux partagent le même schéma de mot de passe :
> **`Atlaas!2026-<username>`**. Usage dev/démo uniquement — ne pas réutiliser en production.

## Administrateurs

| Nom | Username | Email | Mot de passe | Œuvres |
|-----|----------|-------|--------------|:------:|
| Nicky Rindranirina | `nicky_rindranirina` | `nicky_rindranirina@atlaas.local` | `Atlaas!2026-nicky_rindranirina` | 41 |
| Tsiory Rakotoarisoa | `tsiory_rakoto` | `tsiory_rakoto@atlaas.local` | `Atlaas!2026-tsiory_rakoto` | 11 |

## Utilisateurs

| Nom | Username | Email | Mot de passe | Œuvres |
|-----|----------|-------|--------------|:------:|
| Ayoub Belkacem | `ayoub_belkacem` | `ayoub_belkacem@atlaas.local` | `Atlaas!2026-ayoub_belkacem` | 13 |
| Camille Fontaine | `camille_fontaine` | `camille_fontaine@atlaas.local` | `Atlaas!2026-camille_fontaine` | 14 |
| Élodie Rousseau | `elodie_rousseau` | `elodie_rousseau@atlaas.local` | `Atlaas!2026-elodie_rousseau` | 13 |
| Fanja Raharimalala | `fanja_rahari` | `fanja_rahari@atlaas.local` | `Atlaas!2026-fanja_rahari` | 15 |
| Hery Razafindrakoto | `hery_razaf` | `hery_razaf@atlaas.local` | `Atlaas!2026-hery_razaf` | 14 |
| Jonas Wilde | `jonas_wilde` | `jonas_wilde@atlaas.local` | `Atlaas!2026-jonas_wilde` | 15 |
| Julien Mercier | `julien_mercier` | `julien_mercier@atlaas.local` | `Atlaas!2026-julien_mercier` | 9 |
| Lina Marchand | `lina_marchand` | `lina_marchand@atlaas.local` | `Atlaas!2026-lina_marchand` | 10 |
| Mathieu Laurent | `mathieu_laurent` | `mathieu_laurent@atlaas.local` | `Atlaas!2026-mathieu_laurent` | 10 |
| Miora Rasoanaivo | `miora_raso` | `miora_raso@atlaas.local` | `Atlaas!2026-miora_raso` | 15 |
| Mira Okonkwo | `mira_okonkwo` | `mira_okonkwo@atlaas.local` | `Atlaas!2026-mira_okonkwo` | 14 |
| Naina Randrianarisoa | `naina_rando` | `naina_rando@atlaas.local` | `Atlaas!2026-naina_rando` | 14 |
| Njaka Andrianina | `njaka_andrianina` | `njaka_andrianina@atlaas.local` | `Atlaas!2026-njaka_andrianina` | 15 |
| Onja Ratsimba | `onja_ratsimba` | `onja_ratsimba@atlaas.local` | `Atlaas!2026-onja_ratsimba` | 11 |
| Sarah Ben Ali | `sarah_ben_ali` | `sarah_ben_ali@atlaas.local` | `Atlaas!2026-sarah_ben_ali` | 15 |
| Toky Ravaka | `toky_ravaka` | `toky_ravaka@atlaas.local` | `Atlaas!2026-toky_ravaka` | 13 |
| Tomás Reyes | `tomas_reyes` | `tomas_reyes@atlaas.local` | `Atlaas!2026-tomas_reyes` | 10 |

## Compte Google (OAuth)

| Nom | Username | Connexion |
|-----|----------|-----------|
| Sedra Ny Aina Rabemanantsoa | `nyainarabemanantsoa` | Google — pas de mot de passe local |

## Régénérer

```bash
make seed        # idempotent : comptes, œuvres et follows
```

- **Nicky Rindranirina** (admin) publie automatiquement le dossier `seed/trindran/` (41 œuvres).
- Les identifiants des comptes générés sont aussi écrits dans `seed-network-credentials.json` (non versionné).
- Le rôle admin est appliqué en base à la fin du seed (voir `promoteAdmins`).
