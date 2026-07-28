# Soft-launch deploy checklist

Use this before sharing an invite link.

## 1. Build locally

```bash
npm install
npm run lint
npm run build
npm start
```

Smoke on phone-width DevTools + one real iPhone/Android browser:

- [ ] Login shows **Invite beta · cloud sync** when Supabase env is set
- [ ] Google + email magic link work (after providers enabled)
- [ ] Terms / Privacy / Health links open and return via “Back to REPLY”
- [ ] Guest → onboarding → home works
- [ ] Complete one workout → Profile history + Supabase `history_sessions` row
- [ ] Profile → Settings → Sync now succeeds
- [ ] Add to Home Screen shows REPLY icon

## 2. Deploy (Vercel)

### Connect the repo

1. Push to GitHub: `https://github.com/markx195/REPLY---gym-log-app.git`
2. [Vercel](https://vercel.com) → **Add New Project** → import that repo
3. Framework preset: **Next.js** (default)

### Environment variables (Production + Preview)

In Vercel → Project → **Settings → Environment Variables**, add:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key from Supabase → Project Settings → API |

Redeploy after saving env vars (`Deployments → … → Redeploy`).

### Confirm after deploy

- [ ] `https://<host>/manifest.json` returns 200
- [ ] `https://<host>/icon-192.png` and `/icon-512.png` return 200
- [ ] `https://<host>/legal/terms` (and privacy / disclaimer) return 200
- [ ] `https://<host>/auth/callback` loads (blank/brief redirect is OK)
- [ ] HTTPS only (required for installable PWA)

## 3. Supabase Auth URLs (required for prod + Google)

In Supabase → **Authentication → URL Configuration**:

| Field | Value |
| --- | --- |
| **Site URL** | `https://<your-vercel-host>` (local: `http://127.0.0.1:3000`) |
| **Redirect URLs** | `http://127.0.0.1:3000/auth/callback` |
| | `http://localhost:3000/auth/callback` |
| | `https://<your-vercel-host>/auth/callback` |

Also keep Email (magic link) enabled under **Authentication → Providers → Email**.

## 4. Enable Google OAuth

App UI already shows **Continue with Google** in cloud mode. You must enable the provider in Supabase + Google Cloud.

### A. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create/select a project
2. **APIs & Services → OAuth consent screen** → External → app name `REPLY` → add your email as test user while in Testing
3. **Credentials → Create Credentials → OAuth client ID** → type **Web application**
4. **Authorized JavaScript origins**
   - `https://<project-ref>.supabase.co`
   - `http://127.0.0.1:3000` (local)
   - `https://<your-vercel-host>` (prod)
5. **Authorized redirect URIs** (critical — must be the Supabase callback, not the app):
   - `https://<project-ref>.supabase.co/auth/v1/callback`
6. Copy **Client ID** and **Client Secret**

### B. Supabase

1. **Authentication → Providers → Google** → Enable
2. Paste Client ID + Client Secret → Save
3. Confirm redirect URLs from §3 include `/auth/callback` for local + Vercel

### C. Smoke test

- Local: Continue with Google → consent → lands on `/auth/callback` → home/onboarding
- Prod: same on the Vercel host
- If you see `unsupported provider` / `validation_failed`, Google is still off or credentials are wrong

## 5. Invite copy (suggested)

> REPLY invite beta — mobile web workout app.  
> Sign in with Google or email magic link to sync across devices.  
> Guest mode stays on this browser only.  
> Read Terms, Privacy, and the Health disclaimer before training.

## 6. Soft-launch data & notifications

- **Cloud sync:** prefs, history, custom lists, favorites (non-guest). Profile → Settings → Sync now.
- **Device file sync:** Export/Share pack → Import with Merge or Replace (offline handoff).
- **System notifications:** Profile → Weekly reminder → System notification (browser permission).
- Still deferred: remote web-push server, App Store binaries, paid subscriptions.

## 7. Explicitly not in this launch

- App Store / Play Store binaries
- Paid subscriptions
- Complex offline conflict resolution beyond last-write-wins upsert

## 8. After first invites

- Collect “where did you get stuck?” feedback
- Watch CDN image failures on slow networks
- Prioritize conflict UI only if dual-device edits collide often
