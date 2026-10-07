"use client";

import { useEffect, useState } from "react";
import styles from "./member-modal.module.css";

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

function toLabel(statName) {
  return statName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MemberDetailModal({ ign, formulas, onClose }) {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setMember(null);
      try {
        const res = await fetch(`${API_BASE}/api/members/${encodeURIComponent(ign)}`, {
          headers: getHeaders(),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setError(data.message || "Failed to load member.");
          return;
        }

        const found = Array.isArray(data) ? data.find((m) => m.ign === ign) ?? null : data ?? null;
        if (found) setMember(found);
        else setError("Member not found.");
      } catch {
        if (!cancelled) setError("Connection error. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ign]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const gearScore = formulas.reduce((sum, f) => {
    const val = member?.stats?.[f.stat_name];
    if (val == null || val === "") return sum;
    return sum + Number(val) * Number(f.stat_multiplier);
  }, 0);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`${ign} details`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.title}>{ign}</h2>
            <p className={styles.subtitle}>Member detail</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {loading && <p className={styles.muted}>Loading…</p>}
          {error && <p className={styles.errorText}>{error}</p>}

          {!loading && !error && member && (
            <>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Information</h3>
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

              <div className={styles.section}>
                <div className={styles.gearScoreHeader}>
                  <h3 className={styles.sectionTitle}>Gear Score</h3>
                  <div className={styles.gearScoreBadge}>{Math.round(gearScore).toLocaleString()}</div>
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
                              {val != null && val !== "" ? (
                                Number(val).toLocaleString()
                              ) : (
                                <span className={styles.muted}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {GEAR_PROOF_FIELDS.some(({ name }) => member[name]) && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Gear Proof</h3>
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
      </div>
    </div>
  );
}
