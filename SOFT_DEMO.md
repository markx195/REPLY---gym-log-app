# REPLY Soft Demo Runbook

Use this runbook to test and operate the invite beta safely.

## Priority Order

1. P0: Google login stability
2. P0: First session flow in under 60 seconds
3. P1: Discovery + custom list UX polish
4. P1: Cloud sync trust check (2-device)
5. P2: Legal/copy consistency

## P0.1 Google Login Stability

Target: Google OAuth never bounces back to login after successful consent.

### Test steps

1. Open `https://reply-gym-log-app.vercel.app` in Incognito.
2. Tap `Continue with Google`.
3. Complete consent and return to app.
4. Expected: app lands in onboarding/home, not login screen.
5. Sign out and repeat 10 times.

### Pass criteria

- 10/10 successful returns to app
- 0 redirect loops back to login

### Fail capture

If it fails, capture:

- URL after bounce
- Console logs from `/auth/callback`
- timestamp + browser + device

## P0.2 First Session in 60 Seconds

Target: new user reaches completed workout quickly without guidance.

### Test steps

1. Fresh user opens app and logs in.
2. Complete onboarding defaults.
3. Start first workout from Home.
4. Log at least 1 set and finish.
5. Verify session appears in Profile history.

### Pass criteria

- Completed flow in <= 60s by first-time tester
- No dead-end screens

## P1.1 Discovery + Custom List UX

Target: no blocked scrolling and no confusing chip states.

### Test steps

1. Open Discovery and switch filters (my gear/all, muscles, equipment).
2. Scroll exercise library to bottom; ensure items auto-load.
3. Create custom list, search exercises, keep scrolling; ensure auto-load works.
4. Verify active chips are readable in both light and dark theme.

### Pass criteria

- No `Show more` interaction required
- User can access deep catalog items by scrolling only

## P1.2 Cloud Sync Trust Check (2 Devices)

Target: core data sync is reliable enough for demo.

### Test steps

1. Device A: login and finish 1 workout.
2. Device B: login same account.
3. Profile -> Settings -> `Sync now`.
4. Verify same workout appears on Device B.

### Pass criteria

- History/prefs/custom lists/favorites persist between devices

## P2 Legal + Invite Copy

### Verify

- `/legal/terms` loads
- `/legal/privacy` loads
- `/legal/disclaimer` loads
- Invite message clearly says beta and web/PWA nature

## Tester Feedback Form (copy/paste)

1. Device + browser?
2. Did login work first try? (Yes/No)
3. Any moment you got stuck? Where exactly?
4. Could you finish 1 workout without asking for help? (Yes/No)
5. Biggest confusion or frustration in one sentence?
6. Would you use this 3 times/week? Why/why not?

## Demo Decision Gate

Open wider invites only when:

- Google login pass >= 90%
- First session completion >= 80%
- No data loss reports from 2-device sync check
