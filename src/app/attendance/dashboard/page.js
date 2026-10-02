"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getDefenseStat } from "../../../lib/memberStats";
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

const TAB_ALL = "all";
const TAB_NO_CLAN = "none";

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function formatNumber(value) {
  return value == null ? "—" : Math.round(value).toLocaleString();
}

export default function DashboardPage() {
  const [members, setMembers] = useState([]);
  const [clans, setClans] = useState([]);
  const [activeTab, setActiveTab] = useState(TAB_ALL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [membersRes, formulasRes, clansRes] = await Promise.all([
          fetch(`${API_BASE}/api/members`, { headers: getHeaders() }),
          fetch(`${API_BASE}/api/gear-score-formulas`, { headers: getHeaders() }),
          fetch(`${API_BASE}/api/clans`, { headers: getHeaders() }),
        ]);
        const membersData = await membersRes.json();
        const formulasData = await formulasRes.json();
        const clansData = await clansRes.json();

        if (!membersRes.ok || !formulasRes.ok) {
          throw new Error("Failed to load dashboard data.");
        }

        if (clansRes.ok && Array.isArray(clansData)) {
          setClans(clansData);
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

  const tabs = useMemo(() => {
    const clanTabs = clans.map((clan) => ({
      key: String(clan.id),
      label: clan.name,
      count: members.filter((member) => String(member.clan_id) === String(clan.id)).length,
    }));
    const noClanCount = members.filter((member) => member.clan_id == null).length;

    return [
      { key: TAB_ALL, label: "All Clans", count: members.length },
      ...clanTabs,
      ...(noClanCount > 0 ? [{ key: TAB_NO_CLAN, label: "No clan", count: noClanCount }] : []),
    ];
  }, [clans, members]);

  const currentTab = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

  const visibleMembers = useMemo(() => {
    if (currentTab.key === TAB_ALL) return members;
    if (currentTab.key === TAB_NO_CLAN) return members.filter((member) => member.clan_id == null);
    return members.filter((member) => String(member.clan_id) === currentTab.key);
  }, [members, currentTab.key]);

  const showClanColumn = currentTab.key === TAB_ALL;
  const averageGearScore = average(visibleMembers.map((member) => member.gearScore));
  const averageDefense = average(
    visibleMembers.map((member) => getDefenseStat(member)).filter((value) => value != null).map(Number)
  );

  return (
    <div>
      <h1 className={styles.pageTitle}>Welcome back</h1>
      <p className={styles.pageSubtitle}>Here&apos;s an overview of your clan management tools.</p>

      <div className={styles.tabBar} role="tablist" aria-label="Clans">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={tab.key === currentTab.key}
            className={`${styles.tab} ${tab.key === currentTab.key ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className={styles.tabCount}>{tab.count}</span>
          </button>
        ))}
      </div>

      <div className={styles.cardGrid}>
        {[
          { label: "Members", value: visibleMembers.length || "—", desc: "Active members" },
          { label: "Clan", value: currentTab.label, desc: showClanColumn ? "Showing every clan" : "Selected clan" },
          { label: "Avg Gear Score", value: formatNumber(averageGearScore), desc: "Per member" },
          { label: "Avg Defense", value: formatNumber(averageDefense), desc: "Per member" },
        ].map((card) => (
          <div key={card.label} className={styles.statCard}>
            <div className={styles.statLabel}>{card.label}</div>
            <div className={styles.statValue}>{card.value}</div>
            <div className={styles.statDesc}>{card.desc}</div>
          </div>
        ))}
      </div>
      <div className={styles.membersCard}>
        <h2 className={styles.membersTitle}>
          {showClanColumn ? "Members by Gear Score" : `${currentTab.label} · Members by Gear Score`}
        </h2>
        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : error ? (
          <p className={styles.errorText}>{error}</p>
        ) : visibleMembers.length === 0 ? (
          <p className={styles.muted}>No members found.</p>
        ) : (
          <div className={styles.memberTableWrapper}>
            <table className={styles.memberTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>IGN</th>
                  <th>Real IGN</th>
                  {showClanColumn && <th>Clan</th>}
                  <th className={styles.scoreColumn}>Defense</th>
                  <th className={styles.scoreColumn}>Gear Score</th>
                </tr>
              </thead>
              <tbody>
                {visibleMembers.map((member, index) => {
                  const defense = getDefenseStat(member);
                  return (
                  <tr key={member.id}>
                    <td>{index + 1}</td>
                    <td>
                      <Link
                        href={`/attendance/members/${encodeURIComponent(member.ign)}`}
                        className={styles.memberNameLink}
                      >
                        {member.ign}
                      </Link>
                    </td>
                    <td>{member.real_ign || <span className={styles.muted}>—</span>}</td>
                    {showClanColumn && (
                      <td>{member.clan_name || <span className={styles.muted}>—</span>}</td>
                    )}
                    <td className={styles.scoreColumn}>
                      {defense != null
                        ? Number(defense).toLocaleString()
                        : <span className={styles.muted}>—</span>}
                    </td>
                    <td className={styles.scoreColumn}>{Math.round(member.gearScore).toLocaleString()}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
