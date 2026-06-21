# Deploy su Replit — Soundclash

Guida per mettere online il gioco e farlo testare da più persone.

## ⚠️ La scelta che conta: Reserved VM (NON Autoscale)

Le sessioni delle stanze vivono nel processo del server (`lib/server/session-store.ts`).
Per questo il tipo di deployment è decisivo:

- ✅ **Reserved VM** — una sola macchina sempre accesa. Host e telefoni colpiscono lo
  **stesso processo** → il multiplayer funziona **senza modifiche al codice**.
- ❌ **Autoscale** — più istanze che si accendono/spengono: ognuna ha la sua memoria →
  l'host crea la stanza su un'istanza, il giocatore entra su un'altra → "stanza non trovata".
  Non usarlo finché le sessioni non sono su uno store condiviso (Redis/Supabase).

I $100 di crediti coprono ampiamente una Reserved VM per tutto il periodo del contest.

## Passi (UI Replit)

1. **Importa il repo** in un Repl (o apri il Repl esistente del progetto).
2. **Secrets** (Tools → Secrets) — almeno:
   - `MXM_KEY` = chiave Musixmatch **(obbligatoria** — ricerca + testi)
   - `ELEVENLABS_API_KEY` (opzionale — voce host BEATBOT; senza, il gioco funziona, l'errore è gestito)
   - `ELEVENLABS_VOICE_HYPE` / `_JUDGE` / `_DIVA` (opzionali — id voce)
   - `ANTHROPIC_API_KEY` (opzionale — localizza il banter di BEATBOT nelle lingue del narratore diverse da `en`/`it`; senza, quelle lingue ripiegano sul pacchetto inglese e lo show gira lo stesso)
   - `ANTHROPIC_BANTER_MODEL` (opzionale — override del modello, default `claude-opus-4-8`)
   - `LALAL_API_KEY` (opzionale)
   - *(più avanti, se aggiungi lo store)* `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
     `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Non** mettere mai i segreti nel codice o in file committati.
3. **Deploy** → **Reserved VM**:
   - **Build command:** `npm run build`
   - **Run command:** `npm run start`  (lo start script fa il bind su `0.0.0.0:$PORT`)
   - Machine: la più piccola va benissimo per la demo.
4. Avvia il deploy. Ottieni un URL pubblico HTTPS (es. `https://soundclash.<utente>.repl.co`).

## Verifica online (test reale)

1. Apri l'URL sul **portatile/TV** → `Start clash` → crea la stanza host.
2. Sul telefono: **scansiona il QR** (oppure vai su `/join` e digita il codice).
3. L'host parte (`Auto-pick show`) e i telefoni rispondono in tempo reale (polling 1s).
4. Il QR/link usa l'origine reale del deploy → scansiona da qualsiasi telefono. ✅

## Limite noto (in-memory)

Su Reserved VM un **redeploy o un crash riavvia il processo → le stanze attive si perdono**.
Per una demo dal vivo è irrilevante. Per robustezza durante la valutazione si può spostare lo store sessioni su uno store
condiviso (**Upstash Redis** o Supabase). ⚠️ **Non ancora implementato**: oggi
`lib/server/session-store.ts` è una semplice `Map` in-memory, senza alcun codice Redis.
Va aggiunto a mano prima di poterci contare.

## Note Next.js

- `next start` legge `PORT` e fa il bind su `0.0.0.0` (impostato nello script `start`).
- Verifica che `npm run build` passi in locale **a dev server spento** (`next build` mentre
  gira `next dev` corrompe `.next`).
