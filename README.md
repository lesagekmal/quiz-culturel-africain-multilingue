# Quiz Culturel Africain — PWA (Vercel)

## Deploy
- **Env vars (Vercel):**
  - `FEDAPAY_API_KEY` (LIVE)
  - `FEDAPAY_MODE` = `live`
  - `FEDAPAY_RETURN_URL` = `https://votre-domaine/merci`
- **Build & routes:** voir `vercel.json`.

## PWA enforcement
- L’app ne se lance qu’en mode `standalone`. La page `index.html` explique l’installation et bascule sur l’app si `display-mode: standalone`.

## Sécurité & protection des questions
- **Questions côté serveur uniquement** (`/api/questions`), non embarquées dans le client.
- **Pagination limitée** (slice) pour réduire l’extraction massive.
- Ajouter ultérieurement: **rotate**, **signature HMAC** côté serveur + vérif client, **rate-limit** (e.g., KV), et **per-category seeds**.

## Offline
- **Service Worker** avec cache des assets statiques, API en network-first.
- **Bannière connecté/hors ligne** dans l’UI.

## Dons FedaPay
- Flow: client POST `/api/donate/init` ➜ reçoit `redirectUrl` ➜ redirection vers le paiement.
- Gérer le retour via `FEDAPAY_RETURN_URL` et une page de remerciement.
- Pour la production, synchroniser exactement avec la dernière **API FedaPay** (noms de champs et endpoints peuvent évoluer).

## Catégories
- Exemples inclus. Remplacer/étendre avec des catégories culturellement riches, validées éditorialement.