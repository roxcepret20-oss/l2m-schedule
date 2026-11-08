# l2m-schedule (web) — Flow Guide

Quick-read companion to [.github/copilot-instructions.md](.github/copilot-instructions.md) (full knowledge base: file-by-file notes, gotchas).
**Keep this file current:** any change to a flow below (page, route, storage key, API call, rule, env var, cross-repo contract) must be reflected here in the same task.

Next.js 16 App Router, React 19 + React Compiler, plain JS, alias `@/*` → `src/*`, almost every page `"use client"`. Deployed on Vercel. Two backends:

```
Browser ─► Next API routes (/api/bosses, /events, /ffa-day, /validate-pin) ─► Supabase REST (SUPABASE_KEY, server-side)   [boss schedule]
Browser ─► Attendance API (NEXT_PUBLIC_API_BASE_URL) with Bearer JWT                                                    [attendance/members/loans]
```
Writers of Supabase data are the Discord bot + crons; the web only reads it. Attendance data is written via the API only.

## 1. Areas & guards
| Area | Routes | Guard | Storage |
|---|---|---|---|
| Public schedule | `/`, `/pipeline`, `/alt-server`, `/alt-server/pipeline`, (`/ffa-bosses` → `/`) | `PinGate` (soft; raw PIN in `localStorage.shatter_authed`, re-validated via `POST /api/validate-pin` against Supabase `pin_validation`; network error keeps user authed) | `theme`, `tzKey`, volume |
| Admin | `/attendance/*` (public: `/login`, `/members/[ign]`) | `AttendanceAuthLayout` (client redirect; 401 from API → clear token → `/attendance/login`) | `auth_token`, `auth_user` |
| Member portal | `/users/*` (public: `/login`, `/register`) | `UsersAuthLayout` (401 → `/users/login`) | `user_auth_token`, `user_real_ign`, `user_boss_schedule_path` |
| Leaderboard | `/leaderboard` | none | — |

`LayoutShell.js` `BARE_ROUTES = ["/attendance","/users","/leaderboard"]` skip PinGate/Navbar/Footer. Real auth enforcement is in the API; web guards are UX only.
API helpers: `lib/attendanceApi.js` `apiFetch` (admin token, throws `ApiError`), `lib/memberAttendanceApi.js` `memberApiFetch` (member token); some user pages `fetch(`${API_BASE}…`)` directly. `API_BASE` also prefixes `/uploads/...` image URLs.

## 2. Boss schedule flow (Supabase)
```
Discord bot → Supabase bosses/events/ffa_day  →  /api/* (30 s CDN cache) → page.js / BossContainer → cards / pipeline
```
1. `page.js` fetches `/api/bosses` (poll every 2 h; force refresh 00:15 Jakarta), `/api/events`, `/api/ffa-day` once. `?source=duplicate` = `bosses_duplicate` (alt server).
2. **Spawn time** = `kill_timestamp ?? kill_time` + `interval` hours + timezone offset (`TIMEZONES`, hours relative to WIB). `computeSpawnTime` is duplicated in `app/page.js`, `BossContainer.js`, `pipelineGrouping.js` — change all.
3. `BossContainer` ticks every 5 s; drops items 2 min after spawn. Invasion bosses shown Mon/Wed/Fri only. Sort: nearest first, then points (`ffa`=5, `red`=3).
4. **Clan split** (`getClanType`, only if `NEXT_PUBLIC_MULTI_CLAN_MODE=true`): FFA/WAR → both; NORMAL & Mon/Wed/Fri ≥08:00 WIB → both; spawn hour <12 → primary clan, else secondary (`NEXT_PUBLIC_CLAN_PRIMARY/SECONDARY`).
5. **Points badge** (`lib/bossPoints.js`): 00:00–07:59 → 5; 08:00–23:59 → 5 on Mon/Wed/Fri else 3. `/alt-server` uses `getAltServerBossPoints` (00–07:59: ffa/red 5, others 2; 08–23:59: ffa/red 3, others 1; every day).
6. `/pipeline`: items chained into pipelines (gap >10 min starts a new one) — `lib/pipelineGrouping.js`, `components/Pipeline/*`.
7. Events: `events.time` jsonb `{days[0=Mon], time:"HHMM", points, places{day:[place by rotation]}, link}`; `rotation` bumped weekly by the bot cron.
8. Voice alarms (`Helper/BossVoice.js`, `EventVoice.js`): `speechSynthesis` at 5, 1, 0 min before spawn.

## 3. Admin attendance flow (`/attendance/*`, admin JWT → API)
Login `POST /api/auth/login` → `auth_token` → sidebar pages: `dashboard`, `clans`, `members`, `attendances`, `loans`, `clan-savings`, `settings/*`. **Admin roles (API migration 0023):** the `settings/admins` page lets a superadmin set each admin's role (Clan admin / Superadmin) and clan (`PUT/POST /api/admins`). `src/lib/adminProfile.js` (`useAdminProfile`, from `GET /api/auth/me`, cached per token) drives the UI for a `clan_admin`: `/attendance/attendances` only offers their clan (no clan filter; New-attendance modal lists only their clan) and `/attendance/settings/attendance` shows only their clan (no Default, no clan picker; copy-from offers Default only). Other pages (loans, savings, members…) don't adapt yet and rely on API 403s/filtering. Login returns `admin {id,name,role,clan_id,clan_name}`; `GET /api/clans` stays unfiltered.

**Attendance sheet** (`attendances/[id]/page.js`, lifecycle `created → running → done` driven by the API):
1. Load `GET /api/attendances/:id` → `days[]` (entries, ticks, `pvp`), standings, income, salaries. Missing `days[].pvp` ⇒ "API is outdated" error (migration 0017 not applied).
2. **Ticking**: grid of members × entries; `tickCells` → `PATCH /:id/hits` (batch) or `PUT …/hits`; each change is logged (`LogsView`, per-admin colors `lib/adminColors.js`).
3. **Entries** arrive automatically from the bot (boss kills, §6) or manually / from event templates.
4. **Participant OCR** (`lib/participantOcr.js`, `ParticipantsModal`): in-browser tesseract on a 16:9 "Participant" screenshot → fuzzy-match names → bulk tick. Nothing uploaded.
5. **Copy ticks** (`lib/copyGroups.js`, `CopyTicksSheet`): same-day bosses chained within the **clan's** `copy_gap_minutes` (`/api/attendance-settings/copy-gap?clan_id=<sheet clan>`, default 3) → add (never remove) a column's ticks to chosen bosses.
6. **PVP** column (`PvpModal`, `savePvp` → `PUT /:id/pvp`); `computeStandings` adds PVP to points (≥0, not in target).
7. **Check SS** tab (`CheckSsView`): channel picker (`/api/discord/report-channels?clan_id=`), chat feed from `GET /api/attendances/:id/discord-messages` (paged by `next_before`; refetch on focus after 60 s / on image error), "Link member" (`PUT /api/discord/members/:id`), "Tick" reuses `tickCells`, "⚔ PVP Count" opens `PvpModal`; "reviewed" markers in `localStorage.check_ss_reviewed_<id>`, last channel in `check_ss_channel_<clanId>`.
8. **Income** tab (`IncomeView`): add manually or via `IncomeImportModal` (`lib/incomeOcr.js`, in-browser OCR of Clan → Distribute → Tally; only "Sold" rows; per-row taxes; saves sequentially via `POST /:id/income`). Total is copied into a Salary via "Copy from Income".
9. **Settle** snapshots grade thresholds/scores in the API; summary tab shows grade/percent/salary (`lib/attendanceStandings.js`, `lib/money.js`).

**Other admin pages**: `members` (Discord ID, "Check Discord" via `POST /api/discord/members/check`, gear score `lib/gearScore.js`), `loans`, `clan-savings` (Savings + Items tabs; clan in `localStorage.clan_savings_clan`; `/api/clan-savings*`), `settings/{gear_score_formula, attendance, tax, discord_channels, admins, users}`.

**Settings → Attendance is per clan** (`settings/attendance/page.js` + `ClanScope.js`): a "Settings for" selector (Default or a clan; remembered in `localStorage.attendance_settings_clan`) over 5 tabs — Bosses, Point schemas, Daily events, Grade thresholds & scores, General (copy gap). With a clan selected every call carries `?clan_id=`. A section the clan hasn't customized shows the Default read-only (disabled fieldset) with a banner: **Customize (copy Default)**, **Copy from…** (modal: source Default/another clan + sections → `POST /api/attendance-settings/clans/:id/copy`), **Reset to Default** (`DELETE …/sections/:section`); ● on tabs the clan customized (`GET …/clans-status`; if that call fails — old API — the selector is hidden and only Default is shown). In a clan, Bosses can be enabled/disabled, given their own points/schema, or **added as clan-only bosses** (add form with suggestions of the clan's disabled Default bosses; "clan only" badge; "Remove"); renaming/deleting Default bosses stays in Default and bosses added to Default later start disabled in clans with their own list. A clan-only boss is only reported by the bot if its name is also in the bot's `boss_list.js`. The sheet page sends the sheet's `clan.id` as `?clan_id=` to `/copy-gap` and, in `BulkBossModal`, to `/bosses` + `/point-rules` (the API returns only the clan's enabled bosses and its effective rules).

## 4. Member portal flow (`/users/*`, member JWT)
```
REGISTER  DiscordVerify (Discord ID → DM code → verify → verification_token) → register form + token → API → member token
LOGIN     POST /api/users/login → needs_discord_link? yes → DiscordVerify (link) or "Link with Discord" (OAuth) → login payload ; no → token
OAUTH     "Login with Discord" button (DiscordOAuthButton, hidden unless GET /api/users/discord/oauth/config enabled) → lib/discordOAuth.js
          startDiscordOAuth (state+intent in sessionStorage) → Discord → /users/discord/callback → POST …/oauth/login {code, redirect_uri}
          token → login ; needs_account → "I already have an account" (real_ign+password once → …/oauth/link) or "I'm new" (verified
          identity saved in sessionStorage → /users/register skips DiscordVerify) ; intent "link" → …/oauth/link-account {link_token}
          register page also has "Register with Discord" (same callback, auto-continues to the form)
RESET     reset-password/request → DM code → reset-password {code, new_password}
AFTER     profile (own stats/gear), /users/attendance/[id] (read-only sanitized sheet incl. PVP + income), /leaderboard
```
Every member page has a way back to the schedule (`← Schedule`, `MemberMenu` → the member's clan `boss_schedule_path`, cached in `localStorage.user_boss_schedule_path`, fallback `/`; set per clan on `/attendance/clans`).

## 5. Mirrored business logic (must match API)
`lib/pointRules.js` ↔ API `utils/pointRules.js` · `lib/attendanceStandings.js` ↔ `utils/attendanceGrade.js` + `attendanceController.loadSheet` (PVP) · `lib/money.js` ↔ `utils/money.js`. Known mismatch: web `distributeSalary` floors, API rounds half-up (API is truth).

## 6. How data gets here (cross-repo)
```
Discord screenshot/slash cmd → BOT → Supabase (bosses…) → /api/* → schedule pages
                                └→ POST /api/bot/boss-kills → API → attendance entries → admin sheet (auto-appears)
```
Time zone: Asia/Jakarta; attendance `day_index` 0=Mon (JS `getDay()` 0=Sun — convert); weeks Mon–Sun.

## 7. Change checklist
| If you change… | Also touch |
|---|---|
| Any API call/payload | API controllers/routes + API `FLOW.md` |
| Attendance settings screens | API `attendanceSettingsController` / `utils/clanConfig.js` (`?clan_id=` contract), `ClanScope.js`, sheet page `BulkBossModal` + copy-gap |
| Point/grade/PVP/money math | API `utils/*` + `attendanceController` |
| `computeSpawnTime` | `app/page.js`, `BossContainer.js`, `pipelineGrouping.js` |
| Supabase table shape/columns | bot `db.js` / commands |
| Boss names/points/categories | bot `boss_list.js`, Supabase `bosses`, API `attendance_bosses` |
| New env var | `.env.local`, KB "Env" section, this file |
| Any of the above | `.github/copilot-instructions.md` here (+ shared section in all 3 repos and `C:\Users\User\.copilot\copilot-instructions.md` for cross-repo contracts) |
