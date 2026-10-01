"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "./member-detail.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

const GEAR_PROOF_FIELDS = [
  { name: "stats_image", label: "Stats" },
  { name: "soulshot_image", label: "Soulshot" },
  { name: "valor_image", label: "Valor" },
  { name: "guardian_image", label: "Guardian" },
];

function getImageUrl(imageUrl) {
  if (!imageUrl) return "";
  return imageUrl.startsWith("http") ? imageUrl : `${API_BASE}${imageUrl}`;
}

function getHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function toLabel(stat_name) {
  return stat_name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MemberDetailPage() {
  const { ign } = useParams();
  const decodedIgn = decodeURIComponent(ign);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [member, setMember] = useState(null);
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("auth_token"));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [membersRes, formulasRes] = await Promise.all([
          fetch(
            `${API_BASE}/api/members/${encodeURIComponent(decodedIgn)}`,
            { headers: getHeaders() }
          ),
          fetch(`${API_BASE}/api/gear-score-formulas`, { headers: getHeaders() }),
        ]);

        const membersData = await membersRes.json();
        const formulasData = await formulasRes.json();

        if (!membersRes.ok) {
          setError(membersData.message || "Failed to load member.");
          return;
        }

        const found = Array.isArray(membersData)
          ? membersData.find((m) => m.ign === decodedIgn) ?? null
          : membersData ?? null;

        if (!found) {
          setError("Member not found.");
          return;
        }

        setMember(found);

        if (formulasRes.ok && Array.isArray(formulasData)) {
          setFormulas(formulasData);
        }
      } catch {
        setError("Connection error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [decodedIgn]);

  const gearScore = formulas.reduce((sum, f) => {
    const val = member?.stats?.[f.stat_name];
    if (val == null || val === "") return sum;
    return sum + Number(val) * Number(f.stat_multiplier);
  }, 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        {isLoggedIn && (
          <Link href="/attendance/members" className={styles.backLink}>
            ← Members
          </Link>
        )}
        {member && (
          <div>
            <h1 className={styles.title}>{member.ign}</h1>
            <p className={styles.subtitle}>Member detail</p>
          </div>
        )}
        <Link href="/users" className={styles.backLink}>
          Manage My Profile →
        </Link>
      </div>

      {loading && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.errorText}>{error}</p>}

      {!loading && !error && member && (
        <>
          {/* ── Information ── */}
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Information</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>IGN</span>
                <span className={styles.infoValue}>{member.ign}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Real IGN</span>
                <span className={styles.infoValue}>
                  {member.real_ign ?? <span className={styles.muted}>—</span>}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Clan</span>
                <span className={styles.infoValue}>
                  {member.clan_name ?? <span className={styles.muted}>—</span>}
                </span>
              </div>
            </div>
          </div>

          {/* ── Gear Score ── */}
          <div className={styles.card}>
            <div className={styles.gearScoreHeader}>
              <h2 className={styles.sectionTitle}>Gear Score</h2>
              <div className={styles.gearScoreBadge}>
                {Math.round(gearScore).toLocaleString()}
              </div>
            </div>

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
                    const val = member.stats?.[f.stat_name];
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
          </div>

          {GEAR_PROOF_FIELDS.some(({ name }) => member[name]) && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Gear Proof</h2>
              <div className={styles.proofGrid}>
                {GEAR_PROOF_FIELDS.filter(({ name }) => member[name]).map(({ name, label }) => (
                  <div className={styles.proofItem} key={name}>
                    <span className={styles.infoLabel}>{label}</span>
                    <a href={getImageUrl(member[name])} target="_blank" rel="noreferrer">
                      <img
                        className={styles.proofImage}
                        src={getImageUrl(member[name])}
                        alt={`${member.ign} ${label} gear proof`}
                      />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
