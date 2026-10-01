"use client";

import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

function getHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getGearScore(member, formulas) {
  return formulas.reduce((sum, formula) => {
    const value = member.stats?.[formula.stat_name];
    return value == null || value === ""
      ? sum
      : sum + Number(value) * Number(formula.stat_multiplier);
  }, 0);
}

export default function DashboardPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [membersRes, formulasRes] = await Promise.all([
          fetch(`${API_BASE}/api/members`, { headers: getHeaders() }),
          fetch(`${API_BASE}/api/gear-score-formulas`, { headers: getHeaders() }),
        ]);
        const membersData = await membersRes.json();
        const formulasData = await formulasRes.json();

        if (!membersRes.ok || !formulasRes.ok) {
          throw new Error("Failed to load dashboard data.");
        }

        const formulas = Array.isArray(formulasData) ? formulasData : [];
        setMembers(
          (Array.isArray(membersData) ? membersData : [])
            .map((member) => ({
              ...member,
              gearScore: getGearScore(member, formulas),
            }))
            .sort((left, right) => right.gearScore - left.gearScore)
        );
      } catch (loadError) {
        setError(loadError.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <div>
      <h1 className={styles.pageTitle}>Welcome back</h1>
      <p className={styles.pageSubtitle}>Here&apos;s an overview of your clan management tools.</p>
      <div className={styles.cardGrid}>
        {[
          { label: "Members", value: members.length || "—", desc: "Active members" },
          { label: "Clan", value: "—", desc: "Clan info" },
        ].map((card) => (
          <div key={card.label} className={styles.statCard}>
            <div className={styles.statLabel}>{card.label}</div>
            <div className={styles.statValue}>{card.value}</div>
            <div className={styles.statDesc}>{card.desc}</div>
          </div>
        ))}
      </div>
      <div className={styles.membersCard}>
        <h2 className={styles.membersTitle}>Members by Gear Score</h2>
        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : error ? (
          <p className={styles.errorText}>{error}</p>
        ) : members.length === 0 ? (
          <p className={styles.muted}>No members found.</p>
        ) : (
          <div className={styles.memberTableWrapper}>
            <table className={styles.memberTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>IGN</th>
                  <th>Real IGN</th>
                  <th>Clan</th>
                  <th className={styles.scoreColumn}>Gear Score</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => (
                  <tr key={member.id}>
                    <td>{index + 1}</td>
                    <td>{member.ign}</td>
                    <td>{member.real_ign || <span className={styles.muted}>—</span>}</td>
                    <td>{member.clan_name || <span className={styles.muted}>—</span>}</td>
                    <td className={styles.scoreColumn}>{Math.round(member.gearScore).toLocaleString()}</td>
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
