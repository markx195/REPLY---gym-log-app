# REPLY

Train without thinking — discover today’s session and start in seconds.

**Soft-launch / invite beta.** Mobile-first web MVP.

- **Without** Supabase env vars → demo auth + `localStorage` only (same as before).
- **With** Supabase configured → magic-link email + OAuth providers + cloud sync for preferences, history, custom lists, and favorites. Guest mode stays local.

## Stack

- Next.js 16 + React 19 + Tailwind CSS v4
- Optional [Supabase](https://supabase.com) (Auth + Postgres)
- Exercise catalog from [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
- Rule-based daily recommendations (not an AI chatbot)

## Local development

```bash
npm install
cp .env.example .env.local   # optional — fill Supabase keys for cloud mode
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Enable cloud sync (Supabase)

1. Create a Supabase project.
2. SQL editor → run `supabase/schema.sql`.
3. Auth → URL config: add `http://127.0.0.1:3000/auth/callback` (and your Vercel URL).
4. Enable **Email** (magic link). For Google, follow **§4 Enable Google OAuth** in [DEPLOY.md](./DEPLOY.md).
5. Copy project URL + anon key into `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

6. Restart `npm run dev`. Login badge becomes **Invite beta · cloud sync**.

```bash
npm run build && npm start   # production smoke
npm run lint
```

## Product surface

| Area | Notes |
|------|--------|
| Login | Demo local **or** Google + email magic link when Supabase is configured |
| Onboarding | Goals, gear (with images), EN/VI |
| Home | Featured pick + “why today” reason |
| Discovery | Workouts + exercise library filters |
| Active workout | Sets, rest, warmup/RPE, progression cues |
| Profile | Progress hub + settings + Sync now / sync pack |
| Cloud | Preferences, history, lists, favorites (non-guest) |
| Legal | `/legal/terms`, `/legal/privacy`, `/legal/disclaimer` |

## Soft-launch expectations

- **Guest / no Supabase** — data stays in the browser; clearing site data wipes progress
- **Cloud sign-in** — prefs/history/lists/favorites sync via Supabase
- **Installable PWA** via manifest + icons (no offline SW caching)
- **No payments / analytics SDK** in this build
- Optional: Profile → “Load sample history (demo)” for screenshots

## Deploy

Repo: [markx195/REPLY---gym-log-app](https://github.com/markx195/REPLY---gym-log-app)

See [DEPLOY.md](./DEPLOY.md) for Vercel env vars, Auth redirect URLs, and Google OAuth setup.

## License / content

App UI © REPLY project. Catalog images are third-party CDN assets; verify licensing before a commercial store launch.
