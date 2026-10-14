"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { memberApiFetch } from "@/lib/memberAttendanceApi";
import { distributeSalary, formatDiamonds } from "@/lib/money";
import { getGearScore } from "@/lib/gearScore";
import { computeStandings } from "@/lib/attendanceStandings";
import { DAY_NAMES, DAY_SHORT, formatShortDate, formatWeek } from "@/lib/weeks";
import ui from "../../../attendance/components/attendance-ui.module.css";
import styles from "../../../attendance/attendances/[id]/attendance-detail.module.css";
import local from "./member-attendance.module.css";
import MemberMenu from "../../MemberMenu";

const SUMMARY_TAB = 7;
// Bosses first (by time), events last (by time), same order as the admin view.
const byBossThenEvent = (a, b) =>
  (a.kind === "event") - (b.kind === "event") || a.time.localeCompare(b.time) || a.id - b.id;

export default function MemberAttendanceDetailPage() {
  const { id } = useParams();
  const [rawSheet, setSheet] = useState(null);
  // Standings and full score are recomputed here with the same rules as the admin area (empty entries don't count).
  const sheet = useMemo(() => {
    if (!rawSheet) return null;
    const { standings, fullScore } = computeStandings(rawSheet.members, rawSheet.days, rawSheet.thresholds, rawSheet.handicap);
    return { ...rawSheet, standings, full_score: fullScore };
  }, [rawSheet]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [onlyMe, setOnlyMe] = useState(false);

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setLoadError("");
    try {
      setSheet(await memberApiFetch(`/api/member-attendances/${encodeURIComponent(id)}`));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const myId = sheet?.me?.member_id;
  const standingByMember = useMemo(() => new Map((sheet?.standings ?? []).map((s) => [s.member_id, s])), [sheet]);
  const activeSalary = typeof tab === "string" ? sheet?.salaries.find((s) => `salary-${s.id}` === tab) : null;

  const dayEntries = useMemo(
    () => (sheet && typeof tab === "number" && tab < SUMMARY_TAB ? [...sheet.days[tab].entries].sort(byBossThenEvent) : []),
    [sheet, tab]
  );

  const visibleMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sheet?.members ?? []).filter((m) => (!onlyMe || m.id === myId) && (!q || m.ign.toLowerCase().includes(q)));
  }, [sheet, search, onlyMe, myId]);

  if (loading) return <div className={ui.page}><p className={ui.muted}>Loading…</p></div>;

  if (loadError || !sheet) {
    return (
      <div className={ui.page}>
        <Link href="/users/attendance" className={ui.backLink}>← Attendance</Link>
        <div className={ui.banner}>{loadError || "Attendance not found."}</div>
      </div>
    );
  }

  const dayTicks = dayEntries.reduce((sum, e) => sum + e.member_ids.length, 0);

  return (
    <div className={ui.page}>
      <div className={ui.header}>
        <div>
          <Link href="/users/attendance" className={ui.backLink}>← Attendance</Link>
          <h1 className={ui.title}>{sheet.name}</h1>
          <p className={styles.metaLine}>
            <span>Clan: <b>{sheet.clan.name}</b></span>
            <span>·</span>
            <span>Week {formatWeek(sheet.week_start, sheet.week_end)}</span>
            <span>·</span>
            <span className={`${ui.badge} ${ui[`status_${sheet.status}`]}`}>{sheet.status}</span>
          </p>
        </div>
        <div className={ui.actions}>
          <MemberMenu />
          <button className={ui.btnGhost} onClick={() => load({ silent: true })} title="Reload the latest data">↻ Refresh</button>
        </div>
      </div>

      <div className={ui.tabs} role="tablist">
        {sheet.days.map((day) => (
          <button
            key={day.day_index}
            role="tab"
            aria-selected={tab === day.day_index}
            className={`${ui.tab} ${tab === day.day_index ? ui.tabActive : ""}`}
            onClick={() => setTab(day.day_index)}
            title={`${DAY_NAMES[day.day_index]} ${formatShortDate(day.date)}`}
          >
            {DAY_SHORT[day.day_index]}
            <span className={ui.tabCount}>{day.entries.length}</span>
          </button>
        ))}
        <button role="tab" aria-selected={tab === SUMMARY_TAB} className={`${ui.tab} ${tab === SUMMARY_TAB ? ui.tabActive : ""}`} onClick={() => setTab(SUMMARY_TAB)}>
          Σ Summary &amp; grades
        </button>
        {sheet.salaries.map((salary) => (
          <button key={salary.id} role="tab" aria-selected={tab === `salary-${salary.id}`} className={`${ui.tab} ${tab === `salary-${salary.id}` ? ui.tabActive : ""}`} onClick={() => setTab(`salary-${salary.id}`)}>
            💎 {salary.name}
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <label className={ui.muted} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={onlyMe} onChange={(e) => setOnlyMe(e.target.checked)} />
          Only Me
        </label>
        <span className={styles.toolbarSpacer} />
        {typeof tab === "number" && tab < SUMMARY_TAB && (
          <>
            <span className={styles.info}>
              {dayEntries.length} entries · {dayTicks} ticks · {visibleMembers.length}/{sheet.members.length} members
            </span>
            {!onlyMe && (
              <input className={`${ui.input} ${ui.inputSm} ${styles.searchInput}`} placeholder="Search member…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search member" />
            )}
          </>
        )}
      </div>

      {tab === SUMMARY_TAB ? (
        <SummaryView sheet={sheet} onlyMe={onlyMe} myId={myId} />
      ) : activeSalary ? (
        <SalaryView key={activeSalary.id} salary={activeSalary} sheet={sheet} onlyMe={onlyMe} myId={myId} />
      ) : dayEntries.length === 0 ? (
        <div className={`${styles.matrixWrap} ${styles.empty}`}>Nothing on {DAY_NAMES[tab]}.</div>
      ) : (
        <div className={styles.matrixWrap}>
          <table className={styles.matrix}>
            <thead>
              <tr>
                <th className={styles.corner}>Member · week pts · grade</th>
                {dayEntries.map((entry) => (
                  <th key={entry.id} title={entry.server === "invasion" ? "Invasion server" : undefined} className={`${styles.colHead} ${entry.kind === "event" ? styles.colHeadEvent : ""} ${entry.server === "invasion" ? styles.colHeadInvasion : ""}`}>
                    <div className={styles.colName}>{entry.kind === "event" ? "★ " : ""}{entry.name}</div>
                    <div className={styles.colMeta}>{entry.time} · {entry.points}p</div>
                    <div className={styles.colCount}>{entry.member_ids.length}/{sheet.members.length}</div>
                  </th>
                ))}
                <th className={styles.dayPtsHead}>Day pts</th>
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map((member) => {
                const stat = standingByMember.get(member.id);
                const dayPts = dayEntries.reduce((sum, e) => sum + (e.member_ids.includes(member.id) ? e.points : 0), 0);
                return (
                  <tr key={member.id}>
                    <td className={local.memberCell}>
                      <div className={local.memberRow}>
                        <span className={local.memberName} title={member.ign}>{member.ign}</span>
                        <span className={local.memberStat}>
                          {stat?.points ?? 0}
                          <span className={`${ui.grade} ${ui.gradeSm} ${ui[`grade_${stat?.grade ?? "E"}`]}`}>{stat?.grade ?? "E"}</span>
                        </span>
                      </div>
                    </td>
                    {dayEntries.map((entry) => {
                      const on = entry.member_ids.includes(member.id);
                      return (
                        <td
                          key={entry.id}
                          aria-label={`${member.ign} – ${entry.name}: ${on ? "attended" : "not attended"}`}
                          className={`${styles.cell} ${styles.cellReadOnly} ${entry.server === "invasion" ? styles.cellInvasion : ""} ${on ? styles.cellOn : ""}`}
                        >
                          {on ? "✓" : ""}
                        </td>
                      );
                    })}
                    <td className={`${styles.cell} ${styles.dayPts}`} style={{ color: "var(--text)", cursor: "default" }}>{dayPts || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {typeof tab === "number" && tab < SUMMARY_TAB && <p className={ui.hint}>★ = event · grades update as the attendance is ticked.</p>}
    </div>
  );
}

function SummaryView({ sheet, onlyMe, myId }) {
  const [gearById, setGearById] = useState(null);
  const [gearError, setGearError] = useState("");
  const [sortBy, setSortBy] = useState("points");

  useEffect(() => {
    let cancelled = false;
    Promise.all([memberApiFetch("/api/members"), memberApiFetch("/api/gear-score-formulas")])
      .then(([members, formulas]) => {
        if (cancelled) return;
        const list = Array.isArray(formulas) ? formulas : [];
        setGearById(new Map((Array.isArray(members) ? members : []).map((m) => [m.id, getGearScore(m, list)])));
      })
      .catch((err) => !cancelled && setGearError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const perDay = useMemo(() => {
    const map = new Map();
    sheet.members.forEach((m) => map.set(m.id, sheet.days.map(() => 0)));
    sheet.days.forEach((day, d) =>
      day.entries.forEach((entry) =>
        entry.member_ids.forEach((memberId) => {
          if (map.has(memberId)) map.get(memberId)[d] += entry.points;
        })
      )
    );
    return map;
  }, [sheet]);

  // Total Score = gear score + the score value of the member's grade; biggest first.
  const ranked = useMemo(() => {
    const list = sheet.standings.map((s) => {
      const gear = gearById?.get(s.member_id) ?? 0;
      return { ...s, gear, totalScore: gear + (sheet.grade_scores[s.grade] ?? 0) };
    });
    const byPoints = (a, b) => b.points - a.points || b.totalScore - a.totalScore || a.ign.localeCompare(b.ign);
    const byTotal = (a, b) => b.totalScore - a.totalScore || b.points - a.points || a.ign.localeCompare(b.ign);
    return list.sort(sortBy === "total" ? byTotal : byPoints);
  }, [sheet, gearById, sortBy]);

  const rows = ranked.map((s, i) => ({ ...s, place: i + 1 })).filter((s) => !onlyMe || s.member_id === myId);
  const t = sheet.thresholds;
  const sc = sheet.grade_scores;
  const fmt = (n) => Math.round(n).toLocaleString();

  return (
    <div className={ui.card}>
      <div className={ui.stats}>
        <div className={ui.stat}><span>Full attendance score (bosses + events with at least 1 tick)</span><b>{fmt(sheet.full_score)}</b></div>
      </div>
      <h2 className={ui.sectionTitle} style={{ marginBottom: 14 }}>Weekly summary – points per day, grade &amp; total score</h2>
      <label className={ui.hint} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        Sort by
        <select className={ui.select} style={{ width: "auto" }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="points">Points</option>
          <option value="total">Total Score</option>
        </select>
      </label>
      {gearError && <div className={ui.banner}>Gear score could not be loaded ({gearError}). Total Score only includes the grade value.</div>}
      <div className={ui.tableWrapper}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Member</th>
              {DAY_SHORT.map((d) => <th key={d}>{d}</th>)}
              <th>Points</th>
              <th>% of target</th>
              <th>Grade</th>
              <th>Gear Score</th>
              <th>Total Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.member_id}>
                <td>{s.place}</td>
                <td><b>{s.ign}</b></td>
                {perDay.get(s.member_id).map((v, d) => (
                  <td key={d} className={`${styles.summaryNum} ${v ? "" : styles.summaryZero}`}>{v || "–"}</td>
                ))}
                <td><b>{s.points}</b></td>
                <td>{s.percent}%</td>
                <td><span className={`${ui.grade} ${ui[`grade_${s.grade}`]}`}>{s.grade}</span></td>
                <td>{gearById ? fmt(s.gear) : "…"}</td>
                <td><b>{gearById || gearError ? fmt(s.totalScore) : "…"}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={ui.hint}>
        Grades: S ≥ {t.S}% · A ≥ {t.A}% · B ≥ {t.B}% · C ≥ {t.C}% · D ≥ {t.D}% · E below.
        {sheet.status === "done" ? " Saved when this attendance was settled." : " Updates live as the attendance is ticked."}
        <br />
        Total Score = Gear Score + grade value (S {sc.S} · A {sc.A} · B {sc.B} · C {sc.C} · D {sc.D} · E {sc.E}). Sorted highest first by {sortBy === "total" ? "Total Score" : "Points"}.
      </p>
    </div>
  );
}

function SalaryView({ salary, sheet, onlyMe, myId }) {
  const distribution = useMemo(
    () => distributeSalary(sheet.standings.map((s) => ({ member_id: s.member_id, grade: s.grade })), sheet.grade_scores, salary.total_diamonds),
    [sheet, salary.total_diamonds]
  );
  const byMember = useMemo(() => new Map(distribution.rows.map((r) => [r.member_id, r])), [distribution]);
  const rows = useMemo(
    () =>
      sheet.standings
        .map((s) => ({ ...s, ...byMember.get(s.member_id) }))
        .sort((a, b) => b.diamonds - a.diamonds || b.points - a.points || a.ign.localeCompare(b.ign))
        .map((s, i) => ({ ...s, place: i + 1 }))
        .filter((s) => !onlyMe || s.member_id === myId),
    [sheet, byMember, onlyMe, myId]
  );

  return (
    <>
      <div className={ui.card}>
        <div className={ui.stats} style={{ margin: 0 }}>
          <div className={ui.stat}><span>Total diamonds to distribute</span><b>{formatDiamonds(salary.total_diamonds)} 💎</b></div>
          <div className={ui.stat}><span>Distributed</span><b>{formatDiamonds(distribution.distributed)}</b></div>
        </div>
      </div>

      <div className={ui.card}>
        <h2 className={ui.sectionTitle} style={{ marginBottom: 14 }}>{salary.name} – distribution</h2>
        <div className={ui.tableWrapper}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Member</th>
                <th className={ui.num}>Points</th>
                <th>Grade</th>
                <th className={ui.num}>Share</th>
                <th className={ui.num}>Diamonds</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.member_id}>
                  <td>{r.place}</td>
                  <td><b>{r.ign}</b></td>
                  <td className={ui.num}>{formatDiamonds(r.points)}</td>
                  <td><span className={`${ui.grade} ${ui[`grade_${r.grade}`]}`}>{r.grade}</span></td>
                  <td className={ui.num}>{r.share_percent.toFixed(2)}%</td>
                  <td className={ui.num}><b>{formatDiamonds(r.diamonds)}</b> 💎</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
