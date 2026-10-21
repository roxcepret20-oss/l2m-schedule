# l2m-schedule — Project Knowledge Base

> Auto-loaded context. Section 1 is the shared L2M ecosystem map (identical in all 3 repos). Section 2 is this repo.
> If you change a cross-repo contract, update section 1 in all three repos (+ `C:\Users\User\.copilot\copilot-instructions.md`).

---------------------------------------------------------------------------------------------------

# 1. L2M ecosystem (shared)

Game: **Lineage 2M (L2M)**. A clan ("Shatter Company" / Discord "shatterer" server) tracks **boss spawn timers** and **weekly clan attendance** (who hit which boss/event → points → grade → diamond salary, plus loans).

| Repo | Local path | GitHub | Stack | Deployed | Role |
|---|---|---|---|---|---|
| **l2m-schedule** | `C:\Users\User\Documents\GitHub\l2m-schedule` | roxcepret20-oss/l2m-schedule | Next.js 16 (App Router, JS), React 19, React Compiler | Vercel (`l2m-schedule.vercel.app`) | Web UI: boss/event schedule + pipeline, admin attendance area, member portal, leaderboard |
| **l2m-attendance-system-api** | `C:\Users\User\Documents\GitHub\l2m-attendance-system-api` | roxcepret20-oss/l2m-attendance-system-api | Node, Express 5, `pg`, JWT, multer (CommonJS) | Railway (+ Railway Postgres, volume for uploads) | REST API + Postgres for clans, members, attendance, loans, point rules |
| **l2m-boss-updates-discord-bot** | `C:\Users\User\Documents\GitHub\l2m-boss-updates-discord-bot` | roxcepret20-oss/l2m-boss-updates-discord-bot | Node ESM, discord.js 14, tesseract.js, sharp, node-cron, supabase-js | Long-running `node bot.js` (host not recorded) | Reads boss screenshots/slash commands → writes boss kill times; cron resets; forwards kills to the attendance API |

Other sibling folders in `C:\Users\User\Documents\GitHub` (`cepret-l2m-webhook`, `l2m-boss-schedule`, `l2m-schedule-desktop`, `l2m-schedule-react-native`, `*.worktrees`) are NOT covered by this knowledge base.

## Two backends
1. **Supabase (Postgres REST)** — boss schedule data. Project URL `https://nvwbebcnaofggyuvlpxx.supabase.co`.
   Tables: `bosses`, `bosses_duplicate` (alt-server copy), `events`, `ffa_day` (row id=1, `is_ffa` = `NORMAL`|`WAR`), `pin_validation` (row id=1, `pin`), `reset_indicators` (row id=1, `is_need_reset`).
   Writers: Discord bot (and crons). Readers: web (server-side Next API routes proxy it with `SUPABASE_KEY`).
2. **Attendance API (Express + Railway Postgres)** — everything attendance/members/loans. Only the web UI and the bot talk to it.

```
 Discord users ──screenshot / slash cmds──▶ BOT ──write──▶ Supabase (bosses, ffa_day, …) ◀──read── WEB /api/* ◀── browsers (boss cards, pipeline)
                                             │
                                             └─ POST /api/bot/boss-kills (x-api-key) ─▶ ATTENDANCE API ◀── Bearer JWT ── WEB /attendance (admins), /users + /leaderboard (members)
```

## Cross-repo contracts (keep in sync!)
- **Bot → API**: `POST {ATTENDANCE_API_URL}/api/bot/boss-kills`, header `x-api-key: BOT_API_KEY` (same secret value in bot's `ATTENDANCE_API_KEY`). Body `{ clan_name, kills:[{ boss_name, kill_timestamp:"YYYY-MM-DD HH:mm[:ss]" (Asia/Jakarta wall clock), server:"ours"|"invasion" }] }` (1–100 kills). Response `{ clan_id, results:[{status: added|duplicate|cached|skipped|ignored|invalid|error}] }`. Only channels in the bot's `ATTENDANCE_CHANNEL_CLAN_MAP` (channel id → clan name, default boss-updates channel `1482038810572226631` → `FoodCourt`) are synced; the clan name must match `clans.name` (case-insensitive) in the API DB.
- **Boss names** must match case-insensitively between the bot (`slash_command/boss_list.js`), Supabase `bosses.name`, and API `attendance_bosses.name`. A kill for a boss missing from `attendance_bosses` is `ignored` by the API (no points).
- **Web → API**: `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:3000`). Admin token in `localStorage.auth_token`, member token in `localStorage.user_auth_token`. Uploaded images are served by the API at `/uploads/members/...` (web prefixes `API_BASE` when URL isn't absolute).
- **Discord via the API (REST only)**: the API calls Discord's REST API with env `DISCORD_BOT_TOKEN` (same value as the boss bot's `DISCORD_TOKEN`) + `DISCORD_GUILD_ID` (same as the bot's); it never opens a gateway connection (would clash with the boss bot) and the bot repo has no code change. Used for (a) **Discord ID verification** — `members.discord_user_id` (nullable, unique; NULL for legacy members, admins fill them gradually): `POST /api/users/register` requires `discord_id` + `verification_token` (from `POST /api/users/discord/register/send-code` → DM'd 6-digit code → `.../verify-code`); the id must be in our guild and not linked to another member. `POST /api/users/login` returns `{needs_discord_link:true, link_token}` and **no access token** while the member has no id; the web then calls `/api/users/discord/link/send-code` + `/link/verify` (returns the normal login payload). Password reset needs a DM code: `POST /api/users/reset-password/request {real_ign}` then `POST /api/users/reset-password {real_ign, code, new_password}` (code is DM'd to the id stored on the member). (b) **Attendance "Check SS" tab**: admin-only `GET /api/attendances/:id/discord-messages?channel_id=&before=` live-reads a channel listed in `discord_report_channels` (admin CRUD `/api/discord/report-channels`); admins set/verify ids via `PUT /api/discord/members/:id` and `POST /api/discord/members/check`. The bot needs View Channel + Read Message History on those channels. Flow tokens (`link_token`, `verification_token`) are signed with a key derived from `JWT_SECRET` so they can never pass as admin/user access tokens.
- **Duplicated business logic (must mirror)**: point rules (`api src/utils/pointRules.js` ↔ `web src/lib/pointRules.js`), grade/percent/target (`api src/utils/attendanceGrade.js` ↔ `web src/lib/attendanceStandings.js`), money/tax/salary (`api src/utils/money.js`+`attendanceGrade.js` ↔ `web src/lib/money.js`). **Known mismatch**: API salary share rounds half-up (`mulDivRound`) but web `distributeSalary` floors — the API is the source of truth; align the web if it displays payouts.
- **Time conventions**: everything game-side is **Asia/Jakarta (UTC+7)**. Attendance `day_index` / event `days`: **0 = Monday … 6 = Sunday** (JS `getDay()` is 0 = Sunday — always convert). Attendance weeks run Mon–Sun, `week_start` is a Monday. `server` values: `ours` | `invasion` (`type` column in Supabase `bosses`). Invasion bosses only spawn Mon/Wed/Fri.
- **FFA mode** (`ffa_day.is_ffa`, set by bot `/set-ffa`): `NORMAL` | `WAR`. WAR = announced as 5 pts for all bosses and the web shows every boss to both clans; reset daily to NORMAL by bot cron.

## Working conventions (all repos)
- Windows + PowerShell. Plain JavaScript (no TypeScript). No automated tests in any repo — verify by running (`npm run dev` / lint / manual).
- Commit messages are date-style: `Update M/D/YY`. Never commit `.env*` (only `.env.example`).
- Secrets live in `.env` / `.env.local` (git-ignored). Don't print or copy them into docs.
- **Knowledge-base maintenance (mandatory):** any change you make in this repo that alters something documented here (routes, schema/migrations, env vars, commands, crons, business rules, layout, caveats) must be reflected in this file within the same task. If it touches a cross-repo contract or mirrored logic, update section 1 in all three repos' `.github\copilot-instructions.md` and `C:\Users\User\.copilot\copilot-instructions.md`. Say which KB files you updated in your final reply.

---------------------------------------------------------------------------------------------------

# 2. This repo: l2m-schedule (package name `l2m-boss-alarm`, site title "Shatter Schedule")

## Commands
`npm run dev` (http://localhost:3000 — **same port as the API default**; run one on another port, e.g. `npx next dev -p 3001`, or set the API `PORT`) · `npm run build` · `npm start` · `npm run lint` (ESLint 9 + eslint-config-next). No tests. (`deploy`/gh-pages script is a leftover; real deploy is Vercel.)

## Env (`.env.local`, git-ignored)
`SUPABASE_KEY` (server-only, used by Next API routes/services) · `NEXT_PUBLIC_API_BASE_URL` (attendance API base URL) · `NEXT_PUBLIC_MULTI_CLAN_MODE` (`"true"` enables clan views) · `NEXT_PUBLIC_CLAN_PRIMARY` (default `sentinel`) · `NEXT_PUBLIC_CLAN_SECONDARY` (default `scourge`). Supabase URL is hard-coded in `src/lib/supabase.js`.

## Tech notes
Next 16 App Router, React 19, **React Compiler enabled** (`next.config.mjs`), framer-motion (card enter/exit animations), `tesseract.js` (client-side OCR), `sharp` dev dep. Plain JS, alias `@/*` → `src/*`, CSS Modules + `globals.css`. Static image cache headers (1 day + SWR 7 days) in `next.config.mjs`. Almost every page is `"use client"`.

## Routes (`src/app`)
**Public schedule (behind PIN gate)** — `LayoutShell` wraps non-bare routes with `PinGate` + `Navbar`/`Footer`:
- `/` boss + event cards (`page.js` → `BossContainer` → `BossCard`/`NokaBossCard`, `EventCard`/`NokaEventCard`). `?view=all|ffa|<clan>`.
- `/pipeline` boss/event timeline grouped into chains (gap > 10 min starts a new pipeline) — `lib/pipelineGrouping.js`, `components/Pipeline/*`.
- `/alt-server` same as `/` but reads `/api/bosses?source=duplicate` (`bosses_duplicate`). `/ffa-bosses` just redirects to `/`.
- Next API routes (server-side Supabase proxy, `Cache-Control: s-maxage=30, swr=60`): `/api/bosses` (`?category`, `?names`, `?source=duplicate`), `/api/events`, `/api/ffa-day`, `POST /api/validate-pin` (checks `pin_validation`). Implemented in `src/services/*.service.js` using raw Supabase REST + `apikey` header.
**Bare routes (no PIN gate, no navbar)**: `BARE_ROUTES = ["/attendance","/users","/leaderboard"]` in `LayoutShell.js`.
- `/attendance/*` **admin area** (JWT in `localStorage.auth_token`, guard in `AttendanceAuthLayout.js`; `/attendance/login` and `/attendance/members/[ign]` are public): `dashboard`, `clans`, `members` (+ `[ign]`), `attendances` (+ `[id]` — big tick grid with `LogsView` + `ParticipantsModal` OCR import + `IncomeView` tab: income sources with per-item taxes, added via "+ Add income" or "📷 Import from screenshot" (`IncomeImportModal`, see Income OCR below); its total is copied into a Salary via "Copy from Income"; `IncomeView` is reused read-only by `/users/attendance/[id]`; **`CheckSsView` tab "📷 Check SS"** (admin only) = channel dropdown (clan's channels from `/api/discord/report-channels?clan_id=`, last pick in `localStorage.check_ss_channel_<clanId>`), day filter (defaults to today in Jakarta time when today is inside the attendance week, otherwise "All days"), chat-style feed of `GET /api/attendances/:id/discord-messages` (paged with `next_before`, refetch on window focus after 60 s and on image error because Discord CDN links expire), lightbox, "Link member" (`PUT /api/discord/members/:id`), "Tick" modal that reuses the page's `tickCells` for the chosen member/day/entries, local "reviewed" markers in `localStorage.check_ss_reviewed_<attendanceId>`), `loans` (+ `[id]`, `LoanFormModal`), `settings/{gear_score_formula,attendance,tax,discord_channels,admins,users}` (`discord_channels` = per-clan report channel config; `users` shows each user's Discord and a "Check Discord" action to spot mules). `members` has a Discord ID field in the edit modal (saved through `PUT /api/discord/members/:id`), a Discord column with "no Discord ID" / "in server" / "not in server" badges, a Discord filter and a "Check Discord" button (`POST /api/discord/members/check`). Sidebar in `attendance/components/Sidebar.js`.
- `/users/*` **member portal** (`localStorage.user_auth_token`, `user_real_ign`; guard `UsersAuthLayout.js`; public: `/users/login`, `/users/register`): shared `users/components/DiscordVerify.js` (Discord ID → DM code → verify, 60 s resend countdown). **Register** requires a verified Discord ID (`verification_token` sent with the form). **Login**: if the API answers `needs_discord_link` the page shows a "Link Your Discord" step and only stores the token after `/api/users/discord/link/verify`; members that already have an id never see it. **Forgot password** is two steps (request DM code → code + new password). Profile `/users/[real_ign]`, `/users/attendance` (+ `[id]` read-only sheet incl. Income tab; the member detail includes `handicap`/`target_score`, shown read-only in the Summary tab, and the page recomputes standings with `computeStandings` like the admin page). `/leaderboard` (members, gear score ranking; requires member token).

## Data fetching
- Schedule pages poll `/api/bosses` every 2 h, fetch events/ffa once; a timer force-refreshes at 00:15 Jakarta daily; `BossContainer` ticks every 5 s and drops items 2 min after spawn.
- Attendance: `lib/attendanceApi.js` `apiFetch(path,{method,body})` (admin token; 401 → clear token + redirect `/attendance/login`; throws `ApiError`). `lib/memberAttendanceApi.js` `memberApiFetch` (member token; 401 → `/users/login`). Some user pages call `fetch(`${API_BASE}…`)` directly.
- Local storage keys: `theme` (`simple`|`noka`; separate light/dark via `data-theme` attribute), `tzKey`, `shatter_authed` (PIN), `auth_token`, `auth_user`, `user_auth_token`, `user_real_ign`, volume.

## Schedule logic (where the rules live)
- Spawn time = `kill_timestamp ?? kill_time` + `interval` hours (fractional ok) + timezone offset (`TIMEZONES` list: WIB 0, WITA +1, WIT +2, SGT/PHT/MY +1, TH/VN 0 — offset is hours relative to WIB). `computeSpawnTime` is duplicated in `app/page.js`, `BossContainer.js` (and similar helpers in `pipelineGrouping.js`) — change all.
- Invasion-type bosses only shown Mon/Wed/Fri. Sorting: nearest to now first, then points (`ffa`=5, `red`=3).
- **Clan split** (`getClanType` in `page.js`, only when `MULTI_CLAN_MODE`): FFA/WAR → both; NORMAL and Mon/Wed/Fri ≥08:00 WIB → both; spawn hour < 12 → primary clan, else secondary.
- **Boss points** (`lib/bossPoints.js`): 00:00–07:59 → 5; 08:00–23:59 → 5 on Mon/Wed/Fri else 3 (WIB). `ffaMode` is not used by `getBossPoints`; in the web `WAR` only makes every boss visible to both clans (the bot's `/set-ffa` announcement says WAR = 5 pts for all bosses).
- **Events** (`events` table): `time` jsonb `{days[0=Mon], time:"HHMM", points, places{day:[place by rotation]}, link}`, `rotation` incremented weekly by bot cron (TOI Boss max 5, Veora max 1), `is_active`.
- **Voice alarms**: `Helper/BossVoice.js` / `EventVoice.js` use `speechSynthesis` at 5 min, 1 min and 0 min before spawn; `VolumeSlider` controls it.
- **Attendance UI libs** mirror the API: `lib/pointRules.js`, `lib/attendanceStandings.js`, `lib/money.js`, `lib/weeks.js` (Mon–Sun helpers), `lib/gearScore.js` (Σ stat × multiplier from `gear_score_formulas`), `lib/memberStats.js` (`getDefenseStat`), `lib/adminColors.js` (per-admin tick colors; admin read from JWT payload for display only).
- **Participant OCR** (`lib/participantOcr.js`): reads the in-game "Participant" dialog from 16:9 screenshots fully in the browser (tesseract.js on canvas strips; fuzzy name matching with look-alike glyph folding) to bulk-tick members in an attendance. Nothing is uploaded.
- **Income OCR** (`lib/incomeOcr.js`, UI `attendances/[id]/IncomeImportModal.js`): reads the Clan → Distribute → Tally list from 16:9 screenshots in the browser (3 column strips: item name [red text → max-channel contrast], price, status; rows paired by y). Only rows whose status fuzzy-matches "Sold" are kept; name = item name only, amount = price. Review table lets the admin edit name/amount, pick taxes per row (none ticked by default, plus "taxes for all rows"), then saves each ticked row sequentially via `POST /api/attendances/:id/income` (`editor.onCreate`); failed rows stay in the table. No duplicate check (same item + price can legitimately repeat). No API change. Reuses `mapPixels`/`isSameText` from `participantOcr.js`; strip fractions are tuned on the 1365×768/1440×810 sample.

## Gotchas
- API default port (3000) collides with `next dev` default; `.env.local` points `NEXT_PUBLIC_API_BASE_URL` at whichever API you run.
- Source files contain mojibake in some strings (e.g. `â€”`, `â–¾`) from encoding issues — preserve/avoid retyping; don't "fix" unrelated lines.
- `PinGate` stores the raw PIN in `localStorage` and re-validates it via `/api/validate-pin`; network errors keep the user authed. This is a soft gate only.
- Supabase reads use a server-side key; the bot's own Supabase key is separate (bot repo).
- Admin/member auth is client-side redirect only; real enforcement is in the API.
