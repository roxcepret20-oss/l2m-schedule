"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./leaderboard.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

const GEAR_PROOF_FIELDS = [
  { name: "stats_image", label: "Stats" },
  { name: "soulshot_image", label: "Soulshot" },
  { name: "valor_image", label: "Valor" },
  { name: "guardian_image", label: "Guardian" },
];

function toLabel(stat_name) {
  return stat_name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getImageUrl(imageUrl) {
  if (!imageUrl) return "";
  return imageUrl.startsWith("http") ? imageUrl : `${API_BASE}${imageUrl}`;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  function getToken() {
    return typeof window !== "undefined" ? localStorage.getItem("user_auth_token") : null;
  }

  function handleBack() {
    const realIgn = typeof window !== "undefined" ? localStorage.getItem("user_real_ign") : null;
    router.push(realIgn ? `/users/${encodeURIComponent(realIgn)}` : "/users");
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = getToken();
    try {
      const [membersRes, formulasRes] = await Promise.all([
        fetch(`${API_BASE}/api/members`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/gear-score-formulas`),
      ]);

      if (membersRes.status === 401) {
        localStorage.removeItem("user_auth_token");
        localStorage.removeItem("user_real_ign");
        router.replace("/users/login");
        return;
      }

      const membersData = await membersRes.json();
      if (!membersRes.ok) {
        setError(membersData.message || "Failed to load leaderboard.");
        return;
      }

      const formulasData = await formulasRes.json();
      const loadedFormulas = formulasRes.ok && Array.isArray(formulasData) ? formulasData : [];
      setFormulas(loadedFormulas);

      const computed = (Array.isArray(membersData) ? membersData : []).map((member) => {
        const gearScore = loadedFormulas.reduce((sum, f) => {
          const val = member?.stats?.[f.stat_name];
          if (val == null || val === "") return sum;
          return sum + Number(val) * Number(f.stat_multiplier);
        }, 0);
        return { member, gearScore };
      });

      computed.sort((a, b) => b.gearScore - a.gearScore);
      setRows(computed);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Leaderboard</h1>
          <p className={styles.subtitle}>All members ranked by gear score</p>
        </div>
        <button className={styles.btnGhost} onClick={handleBack}>
          ← My Profile
        </button>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Rankings</h2>
        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : rows.length === 0 ? (
          <p className={styles.muted}>No members found.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>IGN</th>
                  <th>Real IGN</th>
                  <th>Clan</th>
                  <th>Gear Score</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ member, gearScore }, index) => (
                  <tr key={member.id}>
                    <td className={styles.rankCell}>{index + 1}</td>
                    <td className={styles.ignCell}>{member.ign}</td>
                    <td>{member.real_ign || <span className={styles.muted}>—</span>}</td>
                    <td>{member.clan_name || <span className={styles.muted}>—</span>}</td>
                    <td className={styles.gearScoreCell}>{Math.round(gearScore).toLocaleString()}</td>
                    <td>
                      <button
                        className={styles.btnGhost}
                        onClick={() => setSelected({ member, gearScore })}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className={styles.modalOverlay} onClick={() => setSelected(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selected.member.ign}</h2>
              <button className={styles.modalClose} onClick={() => setSelected(null)} type="button">
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Real IGN</span>
                  <span className={styles.infoValue}>
                    {selected.member.real_ign || <span className={styles.muted}>—</span>}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Clan</span>
                  <span className={styles.infoValue}>
                    {selected.member.clan_name || <span className={styles.muted}>—</span>}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Gear Score</span>
                  <span className={styles.infoValue}>{Math.round(selected.gearScore).toLocaleString()}</span>
                </div>
              </div>

              <h3 className={styles.modalSectionTitle}>Stats</h3>
              {formulas.length === 0 ? (
                <p className={styles.muted}>No stat formulas configured.</p>
              ) : (
                <table className={styles.statsTable}>
                  <thead>
                    <tr>
                      <th>Stat</th>
                      <th className={styles.numCol}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formulas.map((f) => {
                      const val = selected.member.stats?.[f.stat_name];
                      return (
                        <tr key={f.stat_name}>
                          <td>{toLabel(f.stat_name)}</td>
                          <td className={styles.numCol}>
                            {val != null && val !== "" ? Number(val).toLocaleString() : <span className={styles.muted}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              <h3 className={styles.modalSectionTitle}>Gear Proof</h3>
              {GEAR_PROOF_FIELDS.some(({ name }) => selected.member[name]) ? (
                <div className={styles.proofGrid}>
                  {GEAR_PROOF_FIELDS.filter(({ name }) => selected.member[name]).map(({ name, label }) => (
                    <div className={styles.proofItem} key={name}>
                      <span className={styles.infoLabel}>{label}</span>
                      <a href={getImageUrl(selected.member[name])} target="_blank" rel="noreferrer">
                        <img
                          className={styles.proofImage}
                          src={getImageUrl(selected.member[name])}
                          alt={`${selected.member.ign} ${label} gear proof`}
                        />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.muted}>No gear proof uploaded.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

