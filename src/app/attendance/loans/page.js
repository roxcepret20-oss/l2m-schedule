"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/attendanceApi";
import { formatDiamonds } from "@/lib/money";
import { formatShortDate } from "@/lib/weeks";
import ui from "../components/attendance-ui.module.css";
import styles from "./loans.module.css";
import { LoanFormModal } from "./LoanFormModal";

const STATUS_FILTERS = [
  { value: "", label: "All (not deleted)" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "inactive", label: "Deleted" },
];

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [members, setMembers] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (attendanceFilter) params.set("attendance_id", attendanceFilter);
      const query = params.toString();
      setLoans(await apiFetch(`/api/loans${query ? `?${query}` : ""}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, attendanceFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([apiFetch("/api/attendances"), apiFetch("/api/members"), apiFetch("/api/loan-taxes")])
      .then(([a, m, t]) => {
        setAttendances(a);
        setMembers(m);
        setTaxes(t);
      })
      .catch((err) => setError(err.message));
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? loans.filter((l) => l.member.ign.toLowerCase().includes(q)) : loans;
  }, [loans, search]);

  const totals = useMemo(
    () =>
      visible
        .filter((l) => l.status !== "inactive")
        .reduce((sum, l) => ({ outstanding: sum.outstanding + l.remaining, received: sum.received + l.net_received }), { outstanding: 0, received: 0 }),
    [visible]
  );

  return (
    <div className={ui.page}>
      <div className={ui.header}>
        <div>
          <h1 className={ui.title}>Loans</h1>
          <p className={ui.subtitle}>Diamonds owed by members for items bought from the clan</p>
        </div>
        <button className={ui.btnPrimary} onClick={() => setShowNew(true)} disabled={attendances.length === 0 || members.length === 0}>
          + New loan
        </button>
      </div>

      <div className={ui.stats}>
        <div className={ui.stat}><span>Outstanding (members still owe)</span><b>{formatDiamonds(totals.outstanding)} 💎</b></div>
        <div className={ui.stat}><span>Clan received so far (after tax)</span><b>{formatDiamonds(totals.received)} 💎</b></div>
        <div className={ui.stat}><span>Loans shown</span><b>{visible.length}</b></div>
      </div>

      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <h2 className={ui.sectionTitle}>All loans</h2>
          <div className={styles.filters}>
            <select className={`${ui.select} ${ui.inputSm}`} style={{ width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
              {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <select className={`${ui.select} ${ui.inputSm}`} style={{ width: "auto", maxWidth: 240 }} value={attendanceFilter} onChange={(e) => setAttendanceFilter(e.target.value)} aria-label="Filter by attendance">
              <option value="">All attendances</option>
              {attendances.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input className={`${ui.input} ${ui.inputSm} ${styles.filterSearch}`} placeholder="Search member…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search member" />
          </div>
        </div>

        {error && <div className={ui.banner}>{error}</div>}

        {loading ? (
          <p className={ui.muted}>Loading…</p>
        ) : visible.length === 0 ? (
          <p className={ui.muted}>No loans found.</p>
        ) : (
          <div className={ui.tableWrapper}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Attendance</th>
                  <th>Member</th>
                  <th className={ui.num}>Original</th>
                  <th className={ui.num}>After tax (clan gets)</th>
                  <th className={ui.num}>Paid</th>
                  <th className={ui.num}>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((loan) => (
                  <tr key={loan.id} className={ui.clickRow} onClick={() => router.push(`/attendance/loans/${loan.id}`)}>
                    <td>{formatShortDate(loan.loan_date)}</td>
                    <td>{loan.attendance.name}</td>
                    <td>
                      <Link href={`/attendance/loans/${loan.id}`} className={ui.nameLink} onClick={(e) => e.stopPropagation()}>{loan.member.ign}</Link>
                    </td>
                    <td className={ui.num}>{formatDiamonds(loan.amount)}</td>
                    <td className={ui.num}>{formatDiamonds(loan.after_tax)}</td>
                    <td className={ui.num}>{formatDiamonds(loan.paid)}</td>
                    <td className={ui.num}><b>{formatDiamonds(loan.remaining)}</b></td>
                    <td><span className={`${ui.badge} ${styles[`status_${loan.status}`]}`}>{loan.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <LoanFormModal
          loan={null}
          attendances={attendances}
          members={members}
          taxes={taxes}
          onClose={() => setShowNew(false)}
          onSaved={(saved) => router.push(`/attendance/loans/${saved.id}`)}
        />
      )}
    </div>
  );
}
