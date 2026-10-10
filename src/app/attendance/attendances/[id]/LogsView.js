"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/attendanceApi";
import { colorForAdmin } from "@/lib/adminColors";
import { DAY_SHORT } from "@/lib/weeks";
import ui from "../../components/attendance-ui.module.css";
import styles from "./logs-view.module.css";

const PAGE_SIZE = 100;

const formatTime = (value) =>
  new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

const entryLabel = (log) => `${log.entry_kind === "event" ? "★ " : ""}${log.entry_name ?? "(deleted entry)"}`;
const entryWhen = (log) => (log.entry_day_index == null ? "" : `${DAY_SHORT[log.entry_day_index]} ${log.entry_time ?? ""}`.trim());

// Rows written by one request (a drag, a row/column toggle, an import) share a batch id; show them as one line.
function groupLogs(logs) {
  const groups = [];
  logs.forEach((log) => {
    const last = groups[groups.length - 1];
    if (last && last.batch_id === log.batch_id && last.action === log.action) last.rows.push(log);
    else groups.push({ key: log.id, batch_id: log.batch_id, action: log.action, rows: [log] });
  });
  return groups;
}

function summarize(group) {
  const verb = group.action === "tick" ? "Ticked" : "Unticked";
  const members = new Set(group.rows.map((r) => r.member_id ?? r.member_ign));
  const entries = new Set(group.rows.map((r) => r.entry_id ?? r.entry_name));
  if (entries.size === 1) return `${verb} ${group.rows.length} members on ${entryLabel(group.rows[0])}`;
  if (members.size === 1) return `${verb} ${group.rows[0].member_ign} on ${entries.size} entries`;
  return `${verb} ${group.rows.length} cells (${members.size} members × ${entries.size} entries)`;
}

export default function LogsView({ attendanceId, admins }) {
  const [logs, setLogs] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [adminFilter, setAdminFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());

  const adminById = useMemo(() => new Map(admins.map((a) => [a.id, a])), [admins]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/api/attendances/${attendanceId}/logs?limit=${PAGE_SIZE}`);
      setLogs(data.logs);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [attendanceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    setError("");
    try {
      const before = logs[logs.length - 1].id;
      const data = await apiFetch(`/api/attendances/${attendanceId}/logs?limit=${PAGE_SIZE}&before=${before}`);
      setLogs((prev) => [...prev, ...data.logs]);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter(
      (log) =>
        (!adminFilter || String(log.admin_id) === adminFilter) &&
        (!q || (log.member_ign ?? "").toLowerCase().includes(q) || (log.entry_name ?? "").toLowerCase().includes(q))
    );
  }, [logs, adminFilter, search]);

  const groups = useMemo(() => groupLogs(filtered), [filtered]);

  const toggle = (key) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const adminCell = (log) => {
    const admin = adminById.get(log.admin_id);
    return (
      <span className={styles.admin}>
        <span className={styles.dot} style={{ background: admin ? colorForAdmin(admin) : "var(--muted)" }} />
        {log.admin_name ?? admin?.name ?? "(deleted admin)"}
      </span>
    );
  };

  const actionCell = (action) => (
    <span className={`${styles.action} ${action === "tick" ? styles.actionTick : styles.actionUntick}`}>
      {action === "tick" ? "Tick" : "Untick"}
    </span>
  );

  return (
    <>
      <div className={styles.toolbar}>
        <select className={`${ui.select} ${ui.inputSm}`} value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)} aria-label="Filter by admin">
          <option value="">All admins</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <input className={`${ui.input} ${ui.inputSm}`} placeholder="Search member or boss…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search logs" />
        <span className={styles.spacer} />
        <span className={styles.count}>{filtered.length} of {logs.length} loaded</span>
        <button className={`${ui.btnGhost} ${ui.btnSm}`} onClick={load} disabled={loading}>↻ Refresh</button>
      </div>

      {error && <div className={ui.banner}><span>{error}</span></div>}

      {loading ? (
        <p className={ui.muted}>Loading…</p>
      ) : groups.length === 0 ? (
        <div className={`${styles.empty}`}>
          {logs.length === 0 ? "No tick activity has been logged for this attendance yet." : "No log entries match the filters."}
        </div>
      ) : (
        <div className={ui.tableWrapper}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Boss / event</th>
                <th>Member</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const first = group.rows[0];
                if (group.rows.length === 1) {
                  return (
                    <tr key={group.key}>
                      <td className={styles.when}>{formatTime(first.created_at)}</td>
                      <td>{adminCell(first)}</td>
                      <td>{actionCell(first.action)}</td>
                      <td>{entryLabel(first)} <span className={styles.sub}>{entryWhen(first)}</span></td>
                      <td>{first.member_ign ?? "(deleted member)"}</td>
                    </tr>
                  );
                }
                const open = expanded.has(group.key);
                return (
                  <Fragment key={group.key}>
                    <tr className={ui.clickRow} onClick={() => toggle(group.key)}>
                      <td className={styles.when}>{formatTime(first.created_at)}</td>
                      <td>{adminCell(first)}</td>
                      <td>{actionCell(group.action)}</td>
                      <td colSpan={2}>
                        <b>{open ? "▾" : "▸"} {summarize(group)}</b>
                      </td>
                    </tr>
                    {open &&
                      group.rows.map((log) => (
                        <tr key={log.id} className={styles.child}>
                          <td className={styles.when}>{formatTime(log.created_at)}</td>
                          <td />
                          <td />
                          <td>{entryLabel(log)} <span className={styles.sub}>{entryWhen(log)}</span></td>
                          <td>{log.member_ign ?? "(deleted member)"}</td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && !loading && (
        <div className={styles.more}>
          <button className={ui.btnGhost} onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load more"}</button>
        </div>
      )}

      <p className={ui.hint}>
        Newest first. Only ticks and unticks made after this feature was added are logged; click a grouped line to see every cell it changed.
      </p>
    </>
  );
}
