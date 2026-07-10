# Phase 19: Manual Smoke Test

Run after `npm run dev:backend` and `npm run dev:frontend`. Automated API checks: `npm run smoke`.

Open http://localhost:5174/ and http://localhost:4001/health.

## Automated first

```bash
npm run lint
npm run build
npm run test
npm run verify-env
npm run verify-db
npm run smoke
```

## Manual checklist (FR then spot-check EN)

1. **Home** — hero, animated stats, 3 preview cards (photos first when media exists), photo grid, CTA. No login button.
2. **Language** — toggle switches strings; persists across reload (`ur_lang` in localStorage).
3. **Inventory** — text/quartier/taille/prix filters, chips, URL state, pagination (24/page).
4. **Photos-first** — listings with approved photos before those without; thumbnails render.
5. **Map** — toggle grid↔carte on `/inventaire`; markers stable on repeat toggle; faded fallback shows "Position approximative".
6. **Detail** — gallery, download works, "Je suis intéressé(e)" opens modal with listing chip.
7. **Rappel** — nom+tel only → success; row in `demandes_clients` with correct `listing_id` and message prefix; with `EMAIL_ENABLED=false` backend logs skipped emails.
8. **Prequal** — missing revenu → inline error; complete → row has `revenu_mensuel`, `date_demenagement`, and `Dossier TAL` line in `message`.
9. **Honeypot** — fill hidden `hp` via devtools → success UI but no DB row.
10. **Referral** — `/?listing=<id>&ref=<agentUuid>` → detail page, URL cleaned; lead has `ref_agent_id`. Invalid ref ignored.
11. **Unavailable listing** — `/?listing=<rentedOrDeletedId>` → "n'est plus disponible" with contact button.
12. **Fast Rental admin** — new leads appear in Demandes tab (legacy admin during interim).
13. **Email live** — `EMAIL_ENABLED=true` + verified domain → admin + prospect emails in chosen language.
