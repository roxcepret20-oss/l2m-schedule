"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memberApiFetch } from "@/lib/memberAttendanceApi";
import { formatWeek } from "@/lib/weeks";
import ui from "../../attendance/components/attendance-ui.module.css";
import MemberMenu from "../MemberMenu";

export default function MemberAttendancesPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    memberApiFetch("/api/member-attendances")
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleBack() {
    const realIgn = localStorage.getItem("user_real_ign");
    router.push(realIgn ? `/users/${encodeURIComponent(realIgn)}` : "/users");
  }

  return (
    <div className={ui.page}>
      <div className={ui.header}>
        <div>
          <h1 className={ui.title}>Attendance</h1>
          <p className={ui.subtitle}>Weekly boss and event attendance of your clan</p>
        </div>
        <div className={ui.actions}>
          <MemberMenu />
          <button className={ui.btnGhost} onClick={handleBack}>← My Profile</button>
        </div>
      </div>

      <div className={ui.card}>
        {error && <div className={ui.banner}>{error}</div>}
        {loading ? (
          <p className={ui.muted}>Loading…</p>
        ) : rows.length === 0 && !error ? (
          <p className={ui.muted}>No attendance has started for your clan yet.</p>
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
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={ui.clickRow} onClick={() => router.push(`/users/attendance/${row.id}`)}>
                    <td>
                      <Link href={`/users/attendance/${row.id}`} className={ui.nameLink} onClick={(e) => e.stopPropagation()}>
                        {row.name}
                      </Link>
                    </td>
                    <td>{row.clan_name}</td>
                    <td>{formatWeek(row.week_start, row.week_end)}</td>
                    <td><span className={`${ui.badge} ${ui[`status_${row.status}`]}`}>{row.status}</span></td>
                    <td>{row.member_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
