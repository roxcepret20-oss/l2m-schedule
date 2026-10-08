"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/attendanceApi";
import { formatWeek, weekOptions } from "@/lib/weeks";
import { Modal, ConfirmModal } from "../components/Modal";
import ui from "../components/attendance-ui.module.css";

const STATUS_FILTERS = [
  { value: "", label: "Active (created, running, done)" },
  { value: "created", label: "Created" },
  { value: "running", label: "Running" },
  { value: "done", label: "Done" },
  { value: "inactive", label: "Inactive" },
];

export default function AttendancesPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [clans, setClans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clanFilter, setClanFilter] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (clanFilter) params.set("clan_id", clanFilter);
      const query = params.toString();
      setRows(await apiFetch(`/api/attendances${query ? `?${query}` : ""}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clanFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    apiFetch("/api/clans")
      .then(setClans)
      .catch(() => setClans([]));
  }, []);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/attendances/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await fetchRows();
    } catch (err) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={ui.page}>
      <div className={ui.header}>
        <div>
          <h1 className={ui.title}>Attendances</h1>
          <p className={ui.subtitle}>Weekly boss and event attendance per clan</p>
        </div>
        <button className={ui.btnPrimary} onClick={() => setShowNew(true)}>
          + New
        </button>
      </div>

      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <h2 className={ui.sectionTitle}>All Attendances</h2>
          <div className={ui.actions}>
            <select className={`${ui.select} ${ui.inputSm}`} style={{ width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <select className={`${ui.select} ${ui.inputSm}`} style={{ width: "auto" }} value={clanFilter} onChange={(e) => setClanFilter(e.target.value)} aria-label="Filter by clan">
              <option value="">All clans</option>
              {clans.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className={ui.banner}>{error}</div>}

        {loading ? (
          <p className={ui.muted}>Loading…</p>
        ) : rows.length === 0 ? (
          <p className={ui.muted}>No attendances found.</p>
        ) : (
          <div className={ui.tableWrapper}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Clan</th>
                  <th>Week</th>
                  <th>Status</th>
                  <th>Members</th>
                  <th>Updated By</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={ui.clickRow} onClick={() => router.push(`/attendance/attendances/${row.id}`)}>
                    <td>
                      <Link href={`/attendance/attendances/${row.id}`} className={ui.nameLink} onClick={(e) => e.stopPropagation()}>
                        {row.name}
                      </Link>
                    </td>
                    <td>{row.clan_name}</td>
                    <td>{formatWeek(row.week_start, row.week_end)}</td>
                    <td><span className={`${ui.badge} ${ui[`status_${row.status}`]}`}>{row.status}</span></td>
                    <td>{row.member_count}</td>
                    <td className={ui.mutedCell}>{row.updated_by_name || "—"}</td>
                    <td>
                      {row.status !== "inactive" && (
                        <button
                          className={ui.btnDelete}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(row);
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <NewAttendanceModal
          clans={clans}
          onClose={() => setShowNew(false)}
          onCreated={(id) => router.push(`/attendance/attendances/${id}`)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete attendance?"
          message={`"${deleteTarget.name}" will be marked inactive and hidden from the list. Its data is kept.`}
          confirmLabel="Delete"
          danger
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function NewAttendanceModal({ clans, onClose, onCreated }) {
  const [weeks] = useState(() => weekOptions());
  const [name, setName] = useState("");
  const [weekStart, setWeekStart] = useState(() => weeks.find((w) => w.isCurrent)?.value ?? weeks[0].value);
  const [clanId, setClanId] = useState("");
  const [handicap, setHandicap] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handicapNumber = Number(handicap);
  const handicapValid = handicap.trim() !== "" && Number.isFinite(handicapNumber) && handicapNumber > 0 && handicapNumber <= 10;
  const effectiveClanId = clanId || (clans[0] ? String(clans[0].id) : "");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await apiFetch("/api/attendances", {
        method: "POST",
        body: { name: name.trim(), clan_id: Number(effectiveClanId), week_start: weekStart, handicap: Number(handicap) },
      });
      onCreated(created.id);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title="New attendance"
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="new-attendance-form" className={ui.btnPrimary} disabled={saving || !name.trim() || !effectiveClanId || !handicapValid}>
            {saving ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      <form id="new-attendance-form" onSubmit={handleSubmit}>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="att-name">Name</label>
          <input id="att-name" className={ui.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Attendance September Week 4" maxLength={120} autoFocus required />
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="att-week">Week (Monday – Sunday)</label>
          <select id="att-week" className={ui.select} value={weekStart} onChange={(e) => setWeekStart(e.target.value)}>
            {weeks.map((w) => (
              <option key={w.value} value={w.value}>{w.label}{w.isCurrent ? " (this week)" : ""}</option>
            ))}
          </select>
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="att-clan">Clan</label>
          <select id="att-clan" className={ui.select} value={effectiveClanId} onChange={(e) => setClanId(e.target.value)} required>
            {clans.length === 0 && <option value="">No clans available</option>}
            {clans.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="att-handicap">Handicap</label>
          <input id="att-handicap" type="number" step="0.001" min="0.001" max="10" className={ui.input} value={handicap} onChange={(e) => setHandicap(e.target.value)} required />
        </div>
        <p className={ui.hint}>The attendance starts as <b>Created</b>. Daily events from Attendance Settings are added to the matching days automatically. Handicap (default 1) sets the target score = full attendance score ? handicap.</p>
        {error && <p className={ui.errorText}>{error}</p>}
      </form>
    </Modal>
  );
}
