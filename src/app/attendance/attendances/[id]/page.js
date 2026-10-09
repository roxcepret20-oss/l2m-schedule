"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/attendanceApi";
import { computeStandings } from "@/lib/attendanceStandings";
import { distributeSalary, formatDiamonds } from "@/lib/money";
import { getGearScore } from "@/lib/gearScore";
import { DAY_NAMES, DAY_SHORT, formatShortDate, formatWeek } from "@/lib/weeks";
import { Modal, ConfirmModal } from "../../components/Modal";
import ParticipantsModal from "./ParticipantsModal";
import ui from "../../components/attendance-ui.module.css";
import styles from "./attendance-detail.module.css";

const SUMMARY_TAB = 7;
const OUTDATED_API_MESSAGE =
  "The API server is running old code (it does not return handicap/salaries). Restart the API server, then refresh this page.";
// Bosses first (by time), events last (by time), so events always sit in the right-most columns.
const byBossThenEvent = (a, b) =>
  (a.kind === "event") - (b.kind === "event") || a.time.localeCompare(b.time) || a.id - b.id;

export default function AttendanceDetailPage() {
  const { id } = useParams();
  const attendanceId = Number(id);

  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [activeCell, setActiveCell] = useState({ r: 0, c: 0 });
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const sheetRef = useRef(null);
  const dragRef = useRef(null);
  const queueRef = useRef(Promise.resolve());
  const pointerTypeRef = useRef("mouse");

  useEffect(() => {
    sheetRef.current = sheet;
  }, [sheet]);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setLoadError("");
      try {
        const data = await apiFetch(`/api/attendances/${attendanceId}`);
        if (typeof data.handicap !== "number" || !Array.isArray(data.salaries)) throw new Error(OUTDATED_API_MESSAGE);
        setSheet(data);
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [attendanceId]
  );

  useEffect(() => {
    load();
  }, [load]);

  const readOnly = sheet?.status === "inactive";

  const { standings, fullScore, targetScore } = useMemo(
    () =>
      sheet
        ? computeStandings(sheet.members, sheet.days, sheet.thresholds, sheet.handicap)
        : { standings: [], fullScore: 0, targetScore: 0 },
    [sheet]
  );
  const standingByMember = useMemo(() => new Map(standings.map((s) => [s.member_id, s])), [standings]);

  /* ───────────── local state helpers ───────────── */

  const isChecked = (entryId, memberId) => {
    for (const day of sheetRef.current?.days ?? []) {
      const entry = day.entries.find((e) => e.id === entryId);
      if (entry) return entry.member_ids.includes(memberId);
    }
    return false;
  };

  const applyChanges = useCallback((changes) => {
    setSheet((prev) => {
      if (!prev) return prev;
      const byEntry = new Map();
      changes.forEach((c) => {
        if (!byEntry.has(c.entry_id)) byEntry.set(c.entry_id, []);
        byEntry.get(c.entry_id).push(c);
      });
      return {
        ...prev,
        days: prev.days.map((day) => ({
          ...day,
          entries: day.entries.map((entry) => {
            const list = byEntry.get(entry.id);
            if (!list) return entry;
            const set = new Set(entry.member_ids);
            list.forEach((c) => (c.checked ? set.add(c.member_id) : set.delete(c.member_id)));
            return { ...entry, member_ids: [...set] };
          }),
        })),
      };
    });
  }, []);

  const replaceEntry = useCallback((entryId, patch) => {
    setSheet((prev) =>
      prev && {
        ...prev,
        days: prev.days.map((day) => ({
          ...day,
          entries: day.entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
        })),
      }
    );
  }, []);

  // Requests run one after another so ticks reach the server in the order they were made.
  const enqueue = useCallback((task) => {
    queueRef.current = queueRef.current.then(task);
  }, []);

  const sendChanges = useCallback(
    (changes, inverse) => {
      enqueue(async () => {
        try {
          await apiFetch(`/api/attendances/${attendanceId}/hits`, { method: "PATCH", body: { changes } });
        } catch (err) {
          applyChanges(inverse);
          setActionError(err.message);
        }
      });
    },
    [attendanceId, applyChanges, enqueue]
  );

  // Applies ticks locally right away and syncs them; reverts only these ticks if the server rejects them.
  const tickCells = (cells, value) => {
    const effective = cells.filter((c) => isChecked(c.entryId, c.memberId) !== value);
    if (effective.length === 0) return;
    applyChanges(effective.map((c) => ({ entry_id: c.entryId, member_id: c.memberId, checked: value })));
    sendChanges(
      effective.map((c) => ({ entry_id: c.entryId, member_id: c.memberId, checked: value })),
      effective.map((c) => ({ entry_id: c.entryId, member_id: c.memberId, checked: !value }))
    );
  };

  const setEntryMembers = (entryId, memberIds) => {
    const previous = (sheetRef.current?.days ?? []).flatMap((d) => d.entries).find((e) => e.id === entryId)?.member_ids ?? [];
    replaceEntry(entryId, { member_ids: memberIds });
    enqueue(async () => {
      try {
        await apiFetch(`/api/attendances/${attendanceId}/entries/${entryId}/hits`, {
          method: "PUT",
          body: { member_ids: memberIds },
        });
      } catch (err) {
        replaceEntry(entryId, { member_ids: previous });
        setActionError(err.message);
      }
    });
  };

  /* ───────────── drag / keyboard ticking ───────────── */

  const cellInfo = (el) => {
    const cell = el?.closest?.("td[data-cell]");
    return cell ? { entryId: Number(cell.dataset.entry), memberId: Number(cell.dataset.member) } : null;
  };

  const touchDragCell = (cell) => {
    const drag = dragRef.current;
    const key = `${cell.entryId}:${cell.memberId}`;
    if (!drag || drag.touched.has(key)) return;
    drag.touched.set(key, { ...cell, prev: isChecked(cell.entryId, cell.memberId) });
    applyChanges([{ entry_id: cell.entryId, member_id: cell.memberId, checked: drag.value }]);
  };

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const changed = [...drag.touched.values()].filter((t) => t.prev !== drag.value);
    if (changed.length === 0) return;
    sendChanges(
      changed.map((t) => ({ entry_id: t.entryId, member_id: t.memberId, checked: drag.value })),
      changed.map((t) => ({ entry_id: t.entryId, member_id: t.memberId, checked: t.prev }))
    );
  }, [sendChanges]);

  useEffect(() => {
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [endDrag]);

  const onPointerDown = (e) => {
    pointerTypeRef.current = e.pointerType;
    const cell = cellInfo(e.target);
    // Touch keeps native scrolling and ticks on tap (see onClick); mouse/pen can drag across cells.
    if (!cell || readOnly || e.pointerType === "touch" || e.button !== 0) return;
    dragRef.current = { value: !isChecked(cell.entryId, cell.memberId), touched: new Map() };
    touchDragCell(cell);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const cell = cellInfo(document.elementFromPoint(e.clientX, e.clientY));
    if (cell) touchDragCell(cell);
  };

  const onClick = (e) => {
    const cell = cellInfo(e.target);
    if (!cell || readOnly || pointerTypeRef.current !== "touch") return;
    tickCells([cell], !isChecked(cell.entryId, cell.memberId));
  };

  const onKeyDown = (e) => {
    const td = e.target.closest?.("td[data-cell]");
    if (!td || readOnly) return;
    const r = Number(td.dataset.r);
    const c = Number(td.dataset.c);

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const cell = cellInfo(td);
      tickCells([cell], !isChecked(cell.entryId, cell.memberId));
      return;
    }

    const move = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (!move) return;
    e.preventDefault();
    document.querySelector(`td[data-r="${r + move[0]}"][data-c="${c + move[1]}"]`)?.focus();
  };

  /* ───────────── actions ───────────── */

  const dayEntries = useMemo(
    () => (sheet && typeof tab === "number" && tab < SUMMARY_TAB ? [...sheet.days[tab].entries].sort(byBossThenEvent) : []),
    [sheet, tab]
  );

  const visibleMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sheet ? sheet.members.filter((m) => !q || m.ign.toLowerCase().includes(q)) : [];
  }, [sheet, search]);

  const toggleRow = (memberId) => {
    const all = dayEntries.every((e) => e.member_ids.includes(memberId));
    tickCells(dayEntries.map((e) => ({ entryId: e.id, memberId })), !all);
  };

  const toggleColumn = (entry) => {
    const everyone = sheet.members.length > 0 && entry.member_ids.length === sheet.members.length;
    setEntryMembers(entry.id, everyone ? [] : sheet.members.map((m) => m.id));
  };

  const copyPrevious = (index) => setEntryMembers(dayEntries[index].id, [...dayEntries[index - 1].member_ids]);

  const addEntries = (entries) =>
    setSheet((prev) =>
      prev && {
        ...prev,
        days: prev.days.map((day, i) => {
          const added = entries.filter((e) => e.day_index === i);
          return added.length ? { ...day, entries: [...day.entries, ...added] } : day;
        }),
      }
    );

  async function runStatusAction(path) {
    setBusy(true);
    setActionError("");
    try {
      await queueRef.current;
      await apiFetch(`/api/attendances/${attendanceId}/${path}`, { method: "POST" });
      await load({ silent: true });
      setModal(null);
    } catch (err) {
      setActionError(err.message);
      setModal(null);
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntry(entry) {
    setBusy(true);
    try {
      await queueRef.current;
      await apiFetch(`/api/attendances/${attendanceId}/entries/${entry.id}`, { method: "DELETE" });
      setSheet((prev) =>
        prev && { ...prev, days: prev.days.map((day) => ({ ...day, entries: day.entries.filter((e) => e.id !== entry.id) })) }
      );
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
      setModal(null);
    }
  }

  const activeSalary = typeof tab === "string" ? sheet?.salaries.find((s) => `salary-${s.id}` === tab) : null;

  async function createSalary() {
    setBusy(true);
    setActionError("");
    try {
      const created = await apiFetch(`/api/attendances/${attendanceId}/salaries`, { method: "POST", body: {} });
      setSheet((prev) => prev && { ...prev, salaries: [...prev.salaries, created] });
      setTab(`salary-${created.id}`);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Resolves with the saved salary; throws so the salary view can show the error and restore its inputs.
  async function saveSalary(salaryId, patch) {
    const saved = await apiFetch(`/api/attendances/${attendanceId}/salaries/${salaryId}`, { method: "PUT", body: patch });
    setSheet((prev) => prev && { ...prev, salaries: prev.salaries.map((s) => (s.id === salaryId ? { ...s, ...saved } : s)) });
    return saved;
  }

  async function deleteSalary(salary) {
    setBusy(true);
    try {
      await apiFetch(`/api/attendances/${attendanceId}/salaries/${salary.id}`, { method: "DELETE" });
      setSheet((prev) => prev && { ...prev, salaries: prev.salaries.filter((s) => s.id !== salary.id) });
      setTab(SUMMARY_TAB);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
      setModal(null);
    }
  }

  /* ───────────── render ───────────── */

  if (loading) {
    return <div className={ui.page}><p className={ui.muted}>Loading…</p></div>;
  }

  if (loadError || !sheet) {
    return (
      <div className={ui.page}>
        <Link href="/attendance/attendances" className={ui.backLink}>← Attendances</Link>
        <div className={ui.banner}>{loadError || "Attendance not found."}</div>
      </div>
    );
  }

  const dayTicks = dayEntries.reduce((sum, e) => sum + e.member_ids.length, 0);
  // Keep one cell tabbable even if search/removal shrank the grid below the remembered position.
  const focusRow = Math.min(activeCell.r, Math.max(visibleMembers.length - 1, 0));
  const focusCol = Math.min(activeCell.c, Math.max(dayEntries.length - 1, 0));

  return (
    <div className={ui.page}>
      <div className={ui.header}>
        <div>
          <Link href="/attendance/attendances" className={ui.backLink}>← Attendances</Link>
          <h1 className={ui.title}>{sheet.name}</h1>
          <p className={styles.metaLine}>
            <span>Clan: <b>{sheet.clan.name}</b></span>
            <span>·</span>
            <span>Week {formatWeek(sheet.week_start, sheet.week_end)}</span>
            <span>·</span>
            <span className={`${ui.badge} ${ui[`status_${sheet.status}`]}`}>{sheet.status}</span>
            <span>·</span>
            <span>Handicap <b>{sheet.handicap}</b></span>
            {!readOnly && (
              <button type="button" className={ui.linkBtn} onClick={() => setModal({ type: "rename" })}>? Edit</button>
            )}
          </p>
        </div>
        <div className={ui.actions}>
          <button className={ui.btnGhost} onClick={() => load({ silent: true })} title="Reload the latest data">↻ Refresh</button>
          {!readOnly && <button className={ui.btnGhost} onClick={() => setModal({ type: "rename" })}>Edit name &amp; handicap</button>}
          {sheet.status === "created" && (
            <button className={ui.btnPrimary} onClick={() => setModal({ type: "start" })}>▶ Start</button>
          )}
          {sheet.status === "running" && (
            <button className={ui.btnSuccess} onClick={() => setModal({ type: "settle" })}>✔ Settle</button>
          )}
        </div>
      </div>

      {actionError && (
        <div className={ui.banner}>
          <span>{actionError}</span>
          <button className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setActionError("")}>Dismiss</button>
        </div>
      )}
      {readOnly && <div className={ui.hint} style={{ marginBottom: 14 }}>This attendance is inactive (deleted). It is read-only.</div>}

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
        {!readOnly && (
          <button className={`${ui.tab} ${ui.tabAdd}`} onClick={createSalary} disabled={busy}>+ Salary</button>
        )}
      </div>

      {tab === SUMMARY_TAB ? (
        <SummaryView sheet={sheet} standings={standings} fullScore={fullScore} targetScore={targetScore} onEditHandicap={readOnly ? null : () => setModal({ type: "rename" })} />
      ) : activeSalary ? (
        <SalaryView
          key={activeSalary.id}
          salary={activeSalary}
          sheet={sheet}
          standings={standings}
          readOnly={readOnly}
          onSave={saveSalary}
          onDelete={() => setModal({ type: "deleteSalary", salary: activeSalary })}
        />
      ) : (
        <>
          <div className={styles.toolbar}>
            {!readOnly && (
              <>
                <button className={`${ui.btnPrimary} ${ui.btnSm}`} onClick={() => setModal({ type: "bulk" })}>+ Add bosses</button>
                <button className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setModal({ type: "event" })}>+ Sudden event</button>
              </>
            )}
            <span className={styles.toolbarSpacer} />
            <span className={styles.info}>
              {dayEntries.length} entries · {dayTicks} ticks · {visibleMembers.length}/{sheet.members.length} members
            </span>
            <input className={`${ui.input} ${ui.inputSm} ${styles.searchInput}`} placeholder="Search member…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search member" />
          </div>

          {dayEntries.length === 0 ? (
            <div className={`${styles.matrixWrap} ${styles.empty}`}>
              Nothing on {DAY_NAMES[tab]} yet.
              {!readOnly && (
                <div style={{ marginTop: 14 }}>
                  <button className={ui.btnPrimary} onClick={() => setModal({ type: "bulk" })}>+ Add bosses</button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.matrixWrap}>
              <table
                className={styles.matrix}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onClick={onClick}
                onKeyDown={onKeyDown}
              >
                <thead>
                  <tr>
                    <th className={styles.corner}>Member · week pts · grade</th>
                    {dayEntries.map((entry, i) => (
                      <th key={entry.id} className={`${styles.colHead} ${entry.kind === "event" ? styles.colHeadEvent : ""}`}>
                        {readOnly ? (
                          <div className={styles.colName}>{entry.kind === "event" ? "★ " : ""}{entry.name}</div>
                        ) : (
                          <button type="button" className={`${styles.colName} ${styles.colNameBtn}`} title="Import participants from screenshots" onClick={() => setModal({ type: "participants", entryId: entry.id })}>
                            {entry.kind === "event" ? "★ " : ""}{entry.name}
                          </button>
                        )}
                        <div className={styles.colMeta}>{entry.time} · {entry.points}p</div>
                        <div className={styles.colCount}>{entry.member_ids.length}/{sheet.members.length}</div>
                        {!readOnly && (
                          <div className={styles.colButtons}>
                            <button className={styles.iconBtn} title="Import participants from screenshots" aria-label={`Import participants for ${entry.name}`} onClick={() => setModal({ type: "participants", entryId: entry.id })}>📷</button>
                            <button className={styles.iconBtn} title="Tick / untick everyone" aria-label={`Tick or untick everyone for ${entry.name}`} onClick={() => toggleColumn(entry)}>☑</button>
                            <button className={styles.iconBtn} title="Copy ticks from the previous column" aria-label={`Copy ticks to ${entry.name} from previous column`} disabled={i === 0} onClick={() => copyPrevious(i)}>⧉</button>
                            <button className={styles.iconBtn} title="Edit time / points" aria-label={`Edit ${entry.name}`} onClick={() => setModal({ type: "edit", entry })}>✎</button>
                            <button className={styles.iconBtn} title="Remove" aria-label={`Remove ${entry.name}`} onClick={() => setModal({ type: "remove", entry })}>✕</button>
                          </div>
                        )}
                      </th>
                    ))}
                    <th className={styles.dayPtsHead}>Day pts</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMembers.map((member, r) => {
                    const stat = standingByMember.get(member.id);
                    const dayPts = dayEntries.reduce((sum, e) => sum + (e.member_ids.includes(member.id) ? e.points : 0), 0);
                    return (
                      <tr key={member.id}>
                        <td className={styles.memberCell}>
                          <button className={styles.memberBtn} disabled={readOnly} onClick={() => toggleRow(member.id)} title={`Tick or untick ${member.ign} for the whole of ${DAY_NAMES[tab]}`}>
                            {member.ign}
                            <span className={styles.memberStat}>
                              {stat?.points ?? 0}
                              <span className={`${ui.grade} ${ui.gradeSm} ${ui[`grade_${stat?.grade ?? "E"}`]}`}>{stat?.grade ?? "E"}</span>
                            </span>
                          </button>
                        </td>
                        {dayEntries.map((entry, c) => {
                          const on = entry.member_ids.includes(member.id);
                          return (
                            <td
                              key={entry.id}
                              data-cell
                              data-entry={entry.id}
                              data-member={member.id}
                              data-r={r}
                              data-c={c}
                              role="checkbox"
                              aria-checked={on}
                              aria-label={`${member.ign} – ${entry.name}`}
                              tabIndex={focusRow === r && focusCol === c ? 0 : -1}
                              onFocus={() => setActiveCell({ r, c })}
                              className={`${styles.cell} ${on ? styles.cellOn : ""} ${readOnly ? styles.cellReadOnly : ""}`}
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

          <p className={ui.hint}>
            <b>Click &amp; drag</b> across cells to tick/untick many at once (touch: tap) · click a <b>member name</b> to tick the whole row for this day · column buttons: ☑ everyone, ⧉ copy ticks from the previous column, ✎ edit, ✕ remove · ★ = event · arrow keys + Space also work.
          </p>
        </>
      )}

      {modal?.type === "start" && (
        <ConfirmModal title="Start this attendance?" message="The status changes to Running. You can keep editing entries and ticks." confirmLabel="Start" busy={busy} onConfirm={() => runStatusAction("start")} onClose={() => setModal(null)} />
      )}
      {modal?.type === "settle" && (
        <ConfirmModal title="Settle this attendance?" message="The status changes to Done and the current grade thresholds are saved with it. You can still edit entries afterwards." confirmLabel="Settle" busy={busy} onConfirm={() => runStatusAction("settle")} onClose={() => setModal(null)} />
      )}
      {modal?.type === "remove" && (
        <ConfirmModal title="Remove this entry?" message={`"${modal.entry.name}" (${modal.entry.time}) and all its ticks will be removed.`} confirmLabel="Remove" danger busy={busy} onConfirm={() => deleteEntry(modal.entry)} onClose={() => setModal(null)} />
      )}
      {modal?.type === "rename" && (
        <EditAttendanceModal
          name={sheet.name}
          handicap={sheet.handicap}
          onClose={() => setModal(null)}
          onSave={async (values) => {
            const updated = await apiFetch(`/api/attendances/${attendanceId}`, { method: "PUT", body: values });
            // An outdated API ignores the handicap and does not echo it back; do not pretend it was saved.
            if (updated.handicap !== values.handicap) throw new Error(OUTDATED_API_MESSAGE);
            setSheet((prev) => prev && { ...prev, name: updated.name, handicap: updated.handicap });
            setModal(null);
          }}
        />
      )}
      {modal?.type === "deleteSalary" && (
        <ConfirmModal
          title="Delete this salary?"
          message={`"${modal.salary.name}" and its total are removed. Points and grades are not affected.`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={() => deleteSalary(modal.salary)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "participants" && (() => {
        const entry = sheet.days.flatMap((d) => d.entries).find((e) => e.id === modal.entryId);
        if (!entry) return null;
        return (
          <ParticipantsModal
            entry={entry}
            clanName={sheet.clan.name}
            members={sheet.members}
            tickedIds={new Set(entry.member_ids)}
            onClose={() => setModal(null)}
            onSubmit={async (memberIds) => {
              tickCells(memberIds.map((memberId) => ({ entryId: entry.id, memberId })), true);
              setModal(null);
            }}
          />
        );
      })()}
      {modal?.type === "bulk" && (
        <BulkBossModal
          dayLabel={DAY_NAMES[tab]}
          onClose={() => setModal(null)}
          onSubmit={async (items) => {
            const created = await apiFetch(`/api/attendances/${attendanceId}/entries/bulk`, {
              method: "POST",
              body: { day_index: tab, entries: items },
            });
            addEntries(created);
            setModal(null);
          }}
        />
      )}
      {modal?.type === "event" && (
        <EntryModal
          title={`Add sudden event – ${DAY_NAMES[tab]}`}
          initial={{ name: "", time: "21:00", points: "100" }}
          withName
          submitLabel="Add"
          onClose={() => setModal(null)}
          onSubmit={async (values) => {
            const created = await apiFetch(`/api/attendances/${attendanceId}/entries`, {
              method: "POST",
              body: { day_index: tab, kind: "event", name: values.name, time: values.time, points: values.points },
            });
            addEntries([created]);
            setModal(null);
          }}
        />
      )}
      {modal?.type === "edit" && (
        <EntryModal
          title={`Edit ${modal.entry.name}`}
          initial={{ name: modal.entry.name, time: modal.entry.time, points: String(modal.entry.points) }}
          withName={modal.entry.kind === "event"}
          submitLabel="Save"
          note="Changing points here only affects this entry in this attendance."
          onClose={() => setModal(null)}
          onSubmit={async (values) => {
            const updated = await apiFetch(`/api/attendances/${attendanceId}/entries/${modal.entry.id}`, {
              method: "PUT",
              body: { time: values.time, points: values.points, ...(modal.entry.kind === "event" ? { name: values.name } : {}) },
            });
            replaceEntry(modal.entry.id, { name: updated.name, time: updated.time, points: updated.points });
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

/* ───────────── Summary ───────────── */

function SummaryView({ sheet, standings, fullScore, targetScore, onEditHandicap }) {
  const [gearById, setGearById] = useState(null);
  const [gearError, setGearError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiFetch("/api/members"), apiFetch("/api/gear-score-formulas")])
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
  const rows = useMemo(() => {
    const list = standings.map((s) => {
      const gear = gearById?.get(s.member_id) ?? 0;
      return { ...s, gear, totalScore: gear + (sheet.grade_scores[s.grade] ?? 0) };
    });
    return list.sort((a, b) => b.totalScore - a.totalScore || b.points - a.points || a.ign.localeCompare(b.ign));
  }, [standings, gearById, sheet.grade_scores]);

  const t = sheet.thresholds;
  const sc = sheet.grade_scores;
  const fmt = (n) => Math.round(n).toLocaleString();

  return (
    <div className={ui.card}>
      <div className={ui.stats}>
        <div className={ui.stat}><span>Full attendance score (all bosses + events)</span><b>{fmt(fullScore)}</b></div>
        <div className={ui.stat}>
          <span>Handicap</span>
          <b>{sheet.handicap}</b>
          {onEditHandicap && <button type="button" className={ui.linkBtn} onClick={onEditHandicap}>? Edit handicap</button>}
        </div>
        <div className={ui.stat}><span>Target = full ÷ handicap</span><b>{fmt(targetScore)}</b></div>
      </div>
      <h2 className={ui.sectionTitle} style={{ marginBottom: 14 }}>Weekly summary – points per day, grade &amp; total score</h2>
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
            {rows.map((s, i) => (
              <tr key={s.member_id}>
                <td>{i + 1}</td>
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
        % of target = points ÷ (full attendance score ÷ handicap), not capped. S ≥ {t.S}% · A ≥ {t.A}% · B ≥ {t.B}% · C ≥ {t.C}% · D ≥ {t.D}% · E below.
        {sheet.status === "done" ? " Saved when this attendance was settled." : " Updates live as you tick."}
        <br />
        Total Score = Gear Score + grade value (S {sc.S} · A {sc.A} · B {sc.B} · C {sc.C} · D {sc.D} · E {sc.E}), sorted highest first.
      </p>
    </div>
  );
}

/* ───────────── Modals ───────────── */

function SalaryView({ salary, sheet, standings, readOnly, onSave, onDelete }) {
  const [name, setName] = useState(salary.name);
  const [total, setTotal] = useState(String(salary.total_diamonds));
  const [state, setState] = useState("");
  const [error, setError] = useState("");

  const typedTotal = /^\d+$/.test(total.trim()) ? Number(total) : null;
  const effectiveTotal = typedTotal ?? salary.total_diamonds;

  const distribution = useMemo(
    () => distributeSalary(standings.map((s) => ({ member_id: s.member_id, grade: s.grade })), sheet.grade_scores, effectiveTotal),
    [standings, sheet.grade_scores, effectiveTotal]
  );
  const byMember = useMemo(() => new Map(distribution.rows.map((r) => [r.member_id, r])), [distribution]);
  const rows = useMemo(
    () =>
      standings
        .map((s) => ({ ...s, ...byMember.get(s.member_id) }))
        .sort((a, b) => b.diamonds - a.diamonds || b.points - a.points || a.ign.localeCompare(b.ign)),
    [standings, byMember]
  );

  async function commit(patch, restore) {
    setError("");
    setState("saving");
    try {
      await onSave(salary.id, patch);
      setState("saved");
    } catch (err) {
      setError(err.message);
      setState("");
      restore();
    }
  }

  function commitTotal() {
    if (typedTotal === null) {
      setTotal(String(salary.total_diamonds));
      setError("Total diamonds must be a whole number of 0 or more.");
      return;
    }
    if (typedTotal !== salary.total_diamonds) commit({ total_diamonds: typedTotal }, () => setTotal(String(salary.total_diamonds)));
  }

  function commitName() {
    const next = name.trim();
    if (!next) {
      setName(salary.name);
      return;
    }
    if (next !== salary.name) commit({ name: next }, () => setName(salary.name));
  }

  const enterToBlur = (e) => e.key === "Enter" && e.currentTarget.blur();
  const gs = sheet.grade_scores;

  return (
    <>
      <div className={ui.card}>
        <div className={ui.inlineForm}>
          <div className={ui.field} style={{ flex: 1, maxWidth: 260 }}>
            <label className={ui.label} htmlFor="salary-name">Salary name</label>
            <input id="salary-name" className={ui.input} value={name} maxLength={100} disabled={readOnly} onChange={(e) => setName(e.target.value)} onBlur={commitName} onKeyDown={enterToBlur} />
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="salary-total">Total diamonds to distribute</label>
            <input id="salary-total" type="number" min="0" step="1" className={ui.input} value={total} disabled={readOnly} onChange={(e) => { setState(""); setTotal(e.target.value); }} onBlur={commitTotal} onKeyDown={enterToBlur} />
          </div>
          <span className={ui.muted}>{state === "saving" ? "Saving…" : state === "saved" ? "Saved." : ""}</span>
          {!readOnly && (
            <button className={ui.btnDelete} style={{ marginLeft: "auto" }} onClick={onDelete}>Delete this salary</button>
          )}
        </div>
        {error && <p className={ui.errorText}>{error}</p>}
        <div className={ui.stats} style={{ margin: "14px 0 0" }}>
          <div className={ui.stat}><span>Total grade values</span><b>{formatDiamonds(distribution.total_grade_values)}</b></div>
          <div className={ui.stat}><span>Distributed</span><b>{formatDiamonds(distribution.distributed)}</b></div>
          <div className={ui.stat}><span>Rounding difference</span><b>{formatDiamonds(distribution.remainder)}</b></div>
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
              {rows.map((r, i) => (
                <tr key={r.member_id}>
                  <td>{i + 1}</td>
                  <td><b>{r.ign}</b></td>
                  <td className={ui.num}>{formatDiamonds(r.points)}</td>
                  <td><span className={`${ui.grade} ${ui[`grade_${r.grade}`]}`}>{r.grade}</span></td>
                  <td className={ui.num}>{r.share_percent.toFixed(2)}%</td>
                  <td className={ui.num}><b>{formatDiamonds(r.diamonds)}</b> 💎</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total</td>
                <td className={ui.num}>{distribution.total_grade_values ? "100%" : "0%"}</td>
                <td className={ui.num}>{formatDiamonds(distribution.distributed)} 💎</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className={ui.hint}>
          Diamonds = ROUND(member grade value ÷ total grade values × total diamonds). Grade values come from Attendance Settings (S {gs.S} · A {gs.A} · B {gs.B} · C {gs.C} · D {gs.D} · E {gs.E}).
          Each rounded amount can leave a small difference from the total, shown above. Salaries are independent from Loans: type the total yourself.
        </p>
      </div>
    </>
  );
}

function EditAttendanceModal({ name, handicap, onClose, onSave }) {
  const [nameValue, setNameValue] = useState(name);
  const [handicapValue, setHandicapValue] = useState(String(handicap));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handicapNumber = Number(handicapValue);
  const handicapValid = handicapValue.trim() !== "" && Number.isFinite(handicapNumber) && handicapNumber > 0 && handicapNumber <= 10;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ name: nameValue.trim(), handicap: handicapNumber });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Edit attendance"
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="edit-attendance-form" className={ui.btnPrimary} disabled={saving || !nameValue.trim() || !handicapValid}>{saving ? "Saving…" : "Save"}</button>
        </>
      }
    >
      <form id="edit-attendance-form" onSubmit={handleSubmit}>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="edit-att-name">Name</label>
          <input id="edit-att-name" className={ui.input} value={nameValue} onChange={(e) => setNameValue(e.target.value)} maxLength={120} autoFocus required />
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="edit-att-handicap">Handicap</label>
          <input id="edit-att-handicap" type="number" step="0.001" min="0.001" max="10" className={ui.input} value={handicapValue} onChange={(e) => setHandicapValue(e.target.value)} required />
        </div>
        <p className={ui.hint}>Target score = full attendance score ÷ handicap. Default 1; for example 1.2 makes the target smaller, so members reach higher percentages. Grades update immediately.</p>
        {error && <p className={ui.errorText}>{error}</p>}
      </form>
    </Modal>
  );
}

function EntryModal({ title, initial, withName, submitLabel, note, onClose, onSubmit }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit({ name: values.name.trim(), time: values.time, points: Number(values.points) });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const valid = (!withName || values.name.trim()) && values.time && values.points !== "";

  return (
    <Modal
      title={title}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="entry-form" className={ui.btnPrimary} disabled={saving || !valid}>{saving ? "Saving…" : submitLabel}</button>
        </>
      }
    >
      <form id="entry-form" onSubmit={handleSubmit}>
        {withName && (
          <div className={ui.field}>
            <label className={ui.label} htmlFor="entry-name">Event name</label>
            <input id="entry-name" className={ui.input} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} maxLength={100} placeholder="e.g. Surprise Siege" autoFocus required />
          </div>
        )}
        <div className={ui.formRow}>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="entry-time">Time</label>
            <input id="entry-time" type="time" className={ui.input} value={values.time} onChange={(e) => setValues({ ...values, time: e.target.value })} autoFocus={!withName} required />
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="entry-points">Points</label>
            <input id="entry-points" type="number" min="0" className={ui.input} value={values.points} onChange={(e) => setValues({ ...values, points: e.target.value })} required />
          </div>
        </div>
        {note && <p className={ui.hint}>{note}</p>}
        {error && <p className={ui.errorText}>{error}</p>}
      </form>
    </Modal>
  );
}

function BulkBossModal({ dayLabel, onClose, onSubmit }) {
  const [bosses, setBosses] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [rows, setRows] = useState({});
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/attendance-settings/bosses")
      .then(setBosses)
      .catch((err) => setLoadError(err.message));
  }, []);

  const rowFor = (boss) => rows[boss.id] ?? { checked: false, time: "20:00", points: String(boss.default_points) };
  const update = (boss, patch) => setRows((prev) => ({ ...prev, [boss.id]: { ...rowFor(boss), ...patch } }));

  const q = search.trim().toLowerCase();
  const visible = (bosses ?? []).filter((b) => !q || b.name.toLowerCase().includes(q));
  const selected = (bosses ?? []).filter((b) => rowFor(b).checked);
  const valid = selected.length > 0 && selected.every((b) => rowFor(b).time && rowFor(b).points !== "");

  async function handleSubmit() {
    setSaving(true);
    setError("");
    try {
      await onSubmit(selected.map((b) => ({ boss_id: b.id, time: rowFor(b).time, points: Number(rowFor(b).points) })));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Add bosses – ${dayLabel}`}
      wide
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className={ui.btnPrimary} onClick={handleSubmit} disabled={saving || !valid}>
            {saving ? "Adding…" : `Add ${selected.length || ""} selected`}
          </button>
        </>
      }
    >
      <p className={ui.muted} style={{ marginBottom: 10 }}>Tick every boss that spawned and set its time. Points default from settings and can be changed per spawn.</p>
      <input className={`${ui.input} ${ui.inputSm}`} placeholder="Search boss…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search boss" />
      {loadError && <p className={ui.errorText}>{loadError}</p>}
      {!bosses && !loadError ? (
        <p className={ui.muted} style={{ marginTop: 12 }}>Loading…</p>
      ) : (
        <div className={styles.bulkList}>
          <div className={styles.bulkHead}><span /><span>Boss</span><span>Time</span><span>Points</span></div>
          {visible.map((boss) => {
            const row = rowFor(boss);
            return (
              <div key={boss.id} className={`${styles.bulkRow} ${row.checked ? "" : styles.bulkRowOff}`}>
                <input type="checkbox" checked={row.checked} onChange={(e) => update(boss, { checked: e.target.checked })} aria-label={`Select ${boss.name}`} />
                <span>{boss.name}</span>
                <input type="time" className={`${ui.input} ${styles.bulkField}`} value={row.time} onChange={(e) => update(boss, { time: e.target.value, checked: true })} aria-label={`${boss.name} time`} />
                <input type="number" min="0" className={`${ui.input} ${styles.bulkField}`} value={row.points} onChange={(e) => update(boss, { points: e.target.value })} aria-label={`${boss.name} points`} />
              </div>
            );
          })}
          {visible.length === 0 && <p className={ui.muted}>No bosses found.</p>}
        </div>
      )}
      {error && <p className={ui.errorText}>{error}</p>}
    </Modal>
  );
}
