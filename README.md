# 🎤 Lyric Royale

Party game musicale a base di **testi**, con **conduttore AI**. Costruito per il **Musixmatch Musicathon 2026**.

> Indovina i versi, completa le frasi, riconosci la canzone — e, se hai coraggio, canta. Un emcee AI conduce lo show, commenta e ti prende in giro. Sfida gli amici con un link.

## Stack
- **Next.js** (App Router) + React + Tailwind — web, room-code, zero install
- **Supabase** (Postgres + Auth) — punteggi, sfide, classifiche
- **Replit** — hosting + demo URL pubblico

## Provider / API
| Servizio | Uso nel gioco | Lato | Stato |
|---|---|---|---|
| **Musixmatch** | Testi + synced (richsync) + search + match | server | ✅ testata |
| **ElevenLabs** | Conduttore/giudice AI (TTS) | server | ✅ testata |
| **Anthropic (Claude)** | Genera round + battute host + analisi mood/tema | server | ⬜ da inserire |
| **Supabase** | DB punteggi/sfide/classifiche | client (RLS) + server | ✅ configurata |
| **LALAL.AI** | Stem separation (karaoke, opzionale) | server | ⬜ opzionale |

> Nota: `track.lyrics.mood.get` di Musixmatch è **403** sulla chiave → il mood/tema si calcola con Claude leggendo il testo completo (disponibile).

## ⚠️ Sicurezza chiavi (leggere)
- I segreti vivono SOLO in **`.env.local`** (gitignorato). Mai committare.
- `MXM_KEY`, `ELEVENLABS_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_DB_PASSWORD` sono **server-side**: usali solo in route/server-action Next.js, mai nel browser. Il client chiama il NOSTRO backend, che fa da proxy verso i provider.
- Solo le `NEXT_PUBLIC_SUPABASE_*` sono esposte al browser (protette da RLS).
- In produzione (Replit) reinserisci le stesse variabili nelle **Secrets**.

## Setup locale
1. `cp .env.example .env.local` e riempi i valori
2. `npm install`
3. `npm run dev`

## Compliance Musixmatch
Persistere SOLO **riferimenti** (track_id + indici/timestamp riga + dati generati dall'utente), MAI il testo. Rifetch dei testi **live**. Niente ridistribuzione di testi nelle sfide condivise.
