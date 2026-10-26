# Between Us

A private app of ten real-time games for two partners, each played on your own phone. Answers stay hidden until the game's reveal rule is met, and everything you finish is kept in a shared history with saved moments.

| # | Game | Format |
|---|---|---|
| 1 | Who Is More Likely To? | Simultaneous answers, reveal, optional explanations |
| 2 | How Well Do You Know Me? | Alternate: one answers, one predicts |
| 3 | Our Love Story | Independent memories, shared timeline |
| 4 | After Hours | Agreed comfort level, consent-gated reveal |
| 5 | Future Together | Choices plus Important / Flexible / Still figuring out |
| 6 | Trust & Boundaries | Scenarios with talk-it-through prompts |
| 7 | Conflict Simulator | Responses, perceived needs, reflection prompts |
| 8 | Romance Quest | Challenge journey filtered by budget and time |
| 9 | The Couple's Mystery | Private clue cards (server-held), shared board, validated answers |
| 10 | Story Roulette for Two | Turn-based choices, typeset story |
| 11 | After Dark (18+) | Eight private modes: Truth or Dare, Pick One, Secret Desires, Heat Ladder, Dare Roulette, Who Knows Whom Better, Fantasy Date Builder, Wildcards |

- **Frontend:** React 19 + TypeScript (strict) + Vite + Tailwind CSS v4 + Lucide icons
- **Backend:** Supabase - Postgres, email/password Auth (admin-created accounts), Realtime private channels, RLS
- **Game logic:** server-authoritative PostgreSQL RPC functions (no separate server)
- **Hosting:** GitHub Pages via GitHub Actions

Live site: `https://pavan-pm-portfolio.github.io/bobba_zone/`

---

## How it works

### After Dark boundaries

Each player's adult confirmation, consent, intensity, categories and content type are stored as their own `priv:setup` entry. `after_dark_terms()` returns only the lower intensity, the intersection of categories and a compatible content type, never either player's raw choices. Every mode filters content through those agreed terms, and either player can lower intensity, change categories, skip or end at any time.

### Session engine (games 2-10)

Games 2-10 share one server layer. Each player's answers are *entries* whose key prefix sets who can see them: `pub:` both immediately, `seal:` only after both players have answered, `gated:` only after both answered **and** both consented (`ok:`), `priv:` never (author only, editable, not even shown as "partner answered"). Sealed entries are immutable. Shared progress (current step, turns, quest status) is a JSON state updated with compare-and-set, so simultaneous "Next" presses move the game once. Mystery clues, answers and endings live only in the database and are served per player.


| Concern | Where it lives |
| --- | --- |
| Identity | Email + password accounts that you create in Supabase (no public sign-up). The session persists, so refreshing reclaims the same seat. Anonymous sessions are refused by every RPC. |
| Game state | Postgres. React only mirrors `get_game_state()`. |
| Writes | RPC functions (`create_room`, `join_room`, `submit_answer`, ...). Clients have **no** direct table write access. |
| Answer privacy | The `answers` table is unreadable by clients. Answers leave the database only through `get_game_state` / `get_completed_results`, and only after a question is revealed. |
| Real time | The database broadcasts *signals* (e.g. `answer_submitted`, `question_revealed`) to the private channel `room:<id>`. Payloads never contain choices. Clients refetch state on each signal. Presence on the same channel shows who is online. |
| Resilience | Polling fallback (3s when degraded, 6s while waiting on a partner, 15s otherwise), refetch on reconnect / tab focus / network return. |

### Project structure

```
.github/workflows/deploy.yml   CI: typecheck, tests, build, secret guard, Pages deploy
supabase/migrations/
  20261026000100_schema.sql                 tables, constraints, indexes, RLS, grants
  20261026000200_game_functions.sql         all game RPCs + helpers
  20261026000300_realtime_authorization.sql private-channel policies
  20261026000400_seed_questions.sql         60 questions (4 rounds x 15)
  20261027000600_sessions.sql               generic sessions for games 2-10: sealed/gated entries, shared state, moments, mystery RPCs
  20261027000700_mystery_cases.sql          two original mysteries (clues split between players)
  20261027000800_room_notes.sql             explanations after a reveal (game 1)
  20261027000900_after_dark.sql             After Dark: priv: entries (author-only, forever), agreed-terms intersection
  20261027000500_require_signed_in_accounts.sql  RPCs refuse anonymous sessions
src/
  lib/        supabase client, typed API layer, auth provider, errors, pure game logic
  hooks/      useRoom (state + realtime + presence + polling + recovery)
  components/ ui/ design system (Button, Card, Field, Dialog, Toast, Avatar, ...)
              game/ Lobby, QuestionView (play + reveal), ResultsView, ResultsSummary
  pages/      Welcome, CreateGame, JoinGame, Room, History, HistoryDetail
tests/
  db/         runs the real migrations in an in-process Postgres (PGlite) and
              attacks them as different users - privacy, RLS, scoring, expiry...
  unit/       pure logic (codes, URLs, scoring, copy)
```

---

## Fast path

From the repo root on your Mac: `bash scripts/setup.sh`. It installs, runs the tests, links Supabase, applies all migrations, applies auth settings (`supabase config push`: email login on, sign-up and anonymous off), sets the GitHub repo variables and Pages source (via `gh`), and pushes. Sections 1 and 3 below are the same steps done by hand.

## 1. Supabase setup

Project used here: **Bobba_Zone** (`frzsmsufnnlqptvzhfqu`, Sydney).

1. **Run the migrations** (pick one):
   - **CLI (recommended):**
     ```bash
     npx supabase login
     npx supabase link --project-ref frzsmsufnnlqptvzhfqu
     npx supabase db push        # applies supabase/migrations/* in order, incl. the question seed
     ```
   - **Dashboard:** SQL Editor -> run each file in `supabase/migrations/` in filename order.
2. **Auth settings:** Authentication -> Sign In / Providers -> **Email** enabled; *Allow new users to sign up* **off**; *Allow anonymous sign-ins* **off**. (`supabase config push` applies all of this from `supabase/config.toml`.)
3. **Create players:** Authentication -> Users -> **Add user** -> **Create new user** -> email + password, tick **Auto Confirm User**. Optional display name (pre-fills the name field):
   ```sql
   update auth.users
      set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"display_name":"Shreya"}'
    where email = 'shreya@example.com';
   ```
   To reset a password: Users -> the user -> **...** -> *Change password* (or *Send password recovery*).
4. **Realtime:** no table replication is needed (we use broadcast + presence, not `postgres_changes`). Under Realtime -> Settings you may turn **off** "Allow public access" so only private channels are allowed.
5. **URL configuration:** Authentication -> URL Configuration -> Site URL `https://pavan-pm-portfolio.github.io/bobba_zone/` and add `http://localhost:5173/` to redirect URLs. (Needed for password-recovery emails.)
6. **Keys:** Project Settings -> API Keys -> copy the **publishable** key (`sb_publishable_...`) or the legacy **anon** key. Never use the secret/service-role key in this app.
7. **Optional scheduled cleanup:** expired rooms are also cleaned whenever someone creates a room. To run it hourly regardless, enable the `pg_cron` extension and run:
   ```sql
   select cron.schedule('cleanup-rooms', '17 * * * *', $$select public.cleanup_expired_rooms()$$);
   ```

### Editing questions

Questions are rows in `public.questions` (`slug` is the stable id, `category`, `question_text`, `discussion_prompt`, `is_active`, `display_order`). Add a new migration file with `insert ... on conflict (slug) do update` or `update ... set is_active = false`. No frontend change is needed.

---

## 2. Local development

```bash
npm install
cp .env.example .env.local     # fill in URL + publishable key
npm run dev                     # http://localhost:5173
npm test                        # 92 tests: database security + unit
npm run build                   # typecheck + production build
```

To play locally with two players, sign in as two different accounts in two **different browser profiles** (or one normal + one private window). Two tabs of the same profile share one session, i.e. one seat.

---

## 3. GitHub Pages deployment

1. Repo -> Settings -> Pages -> Source: **GitHub Actions**.
2. Repo -> Settings -> Secrets and variables -> Actions -> **Variables**:
   - `VITE_SUPABASE_URL` = `https://frzsmsufnnlqptvzhfqu.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your publishable/anon key
   (Secrets with the same names also work.)
3. Push to `main`. The workflow typechecks, runs all tests, builds with base path `/<repo>/`, checks the bundle for leaked privileged keys, and deploys.

### Routing and invite links

GitHub Pages can't rewrite unknown paths to `index.html`, so a browser route like `/bobba_zone/join/ABCD2345` would 404 on refresh. The app uses **hash routing** instead: invite links look like

```
https://pavan-pm-portfolio.github.io/bobba_zone/#/join/ABCD2345
```

These work on first load, on refresh and when shared, with no server config. The invite code is not a secret credential: joining still requires a signed-in session, an open seat and passes rate limiting.

---

## 4. Two-person test plan (manual, end to end)

Use two devices, or two browser profiles.

1. **A** signs in -> *Create a game* -> name "Shreya", Quick play -> lands in the lobby with a code and an empty second seat.
2. **A** copies the invite link and sends it. **B** opens it -> signs in -> code is pre-filled -> name "Pavan" -> *Join game*. A's lobby shows Pavan within ~1s without refreshing.
3. Try to join with a third profile: it gets "That code doesn't match an open game...".
4. Both tap *I'm ready*. Only A sees an enabled *Start the game*. A starts; both screens switch to question 1.
5. **A** picks a name and locks in. A sees "Your answer is locked in. Waiting for Pavan". B sees "Shreya has answered" but **not** the choice.
6. **Privacy probe (B's browser DevTools console)** while A has answered and B hasn't:
   ```js
   const sb = (await import('https://esm.sh/@supabase/supabase-js@2')).createClient(URL, KEY, { auth: { storageKey: 'wml-couples-auth' } });
   await sb.from('answers').select('*');            // -> permission denied
   await sb.from('game_rooms').select('*');         // -> permission denied
   await sb.rpc('get_game_state', { p_room_id: ROOM_ID }); // current.answers === null
   ```
   Also watch DevTools -> Network -> WS frames: `answer_submitted` carries only `player_number` and `question_index`.
7. **B** locks in: both screens reveal at the same moment, with hearts if you matched.
8. Refresh either tab during the reveal: the same reveal comes back.
9. Both tap *Next question* at the same time: the game advances exactly once.
10. On a question, A taps *Ask to skip*; B sees the request and taps *Skip it too*. It's excluded from the score.
11. Turn off Wi-Fi on one device for 20s, then back on: the badge shows Offline/Reconnecting, then Live, and state catches up.
12. Finish the game -> results with percentage, round breakdown, differences and prompts. *Play again* on either device moves **both** into one new lobby.
13. *Past games* -> open a game -> *Delete this game* -> it disappears for both players.

---

## 5. Edge-case behaviour

| Situation | Behaviour |
| --- | --- |
| Player disconnects before answering | The question waits. No timer skips it. Partner sees "Away"; when they return, state reloads exactly where it was. |
| Player disconnects after answering | Their answer is already stored. If the partner answers meanwhile, the reveal happens server-side and is shown when they reconnect. |
| Both submit at nearly the same time | `submit_answer` locks the question row; the second transaction sees both answers and performs the reveal. Exactly one reveal. |
| Refresh during reveal | `get_game_state` returns the revealed answers again. |
| Room expires | Rooms expire 24h after last activity. Every action returns `room_expired`; the UI shows an expired screen; cleanup marks it cancelled and purges after 7 days. |
| Two clients press Next together | `advance_question(p_from_index)` is compare-and-set under a row lock; only one moves the index, the other gets `moved: false`. |
| Same player submits twice | Same choice: idempotent success. Different choice: `already_submitted`. A trigger makes answers immutable even for privileged writes. |

---

## 6. Deployment checklist

- [ ] Migrations 100-900 applied (`supabase db push`) - `select count(*) from public.questions` returns 60
- [ ] Email login on, public sign-up off, anonymous off
- [ ] Player accounts created (Auto Confirm)
- [ ] Site URL / redirect URLs set
- [ ] (Optional) Realtime "Allow public access" off
- [ ] GitHub Pages source = GitHub Actions
- [ ] Repo variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` set
- [ ] Actions run green (typecheck, tests, build, secret guard, deploy)
- [ ] Two-person test plan passes on the live URL

## 7. Security checklist

- [x] RLS enabled on every table; no client privileges on rooms, players, questions-in-game, answers, results or rate-limit tables
- [x] Only `SELECT` on active questions and on the caller's own profile is granted directly
- [x] All game RPCs are `SECURITY DEFINER` with `search_path = ''`, schema-qualified names, caller from `auth.uid()` only
- [x] Membership checked server-side on every room RPC (same error for "missing" and "not yours")
- [x] Partner's choice returned only after `status = 'revealed'`, which only the server sets after both answers exist
- [x] Realtime: private channels, members-only via RLS on `realtime.messages`; clients may publish presence only, so they cannot spoof game events; payloads contain no choices
- [x] Clients cannot set player ids, seats, host, scores, timestamps or reveal state
- [x] Answers unique per (question, player) and immutable (trigger)
- [x] Invite codes: 8 chars from a 32-symbol alphabet (~1.1 trillion), CSPRNG, generic error, 10 failed joins / 15 min per user
- [x] Room creation limited to 20 / hour per user; room expiry + retention cleanup
- [x] Inputs validated in SQL (names, modes, rounds, choices, ids)
- [x] Internal helper functions not executable by clients
- [x] Only the publishable key ships to the browser; CI fails if a secret key or service-role JWT appears in `dist/`
- [ ] **Verify in production:** run step 6 of the test plan against the live project
- [ ] **Verify in production:** Supabase Dashboard -> Advisors -> Security shows no warnings for these tables/functions

## Known limitations

- Accounts are admin-created; there's no self-service sign-up or password reset screen in the app (reset from the Supabase dashboard).
- Signing in on another device reclaims the same seat, since seats belong to the account.
- Presence ("Here"/"Away") depends on Realtime; if Realtime is down, the game still works via polling but presence shows Away.
- Database tests use PGlite (single connection). True parallel transactions are covered by row locks in the SQL, but concurrency is verified logically (compare-and-set, idempotency) rather than with two live connections.
