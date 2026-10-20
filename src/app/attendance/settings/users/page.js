"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "../gear_score_formula/gear_score_formula.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

function getHeaders() {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function UsersSettingsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deactivateId, setDeactivateId] = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [discordStatus, setDiscordStatus] = useState({});
  const [discordChecking, setDiscordChecking] = useState(false);

  async function checkDiscord() {
    setDiscordChecking(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/discord/members/check`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDiscordStatus(Object.fromEntries(data.results.map((r) => [r.member_id, r.status])));
        if (data.truncated) setError("Only the first 300 linked members were checked.");
        else if (data.results.some((r) => r.status === "error")) setError("Some members could not be checked (Discord error). Try again.");
      } else {
        setError(data.message || "Failed to check Discord.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setDiscordChecking(false);
    }
  }

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/users`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      } else {
        setError(data.message || "Failed to load users.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleDeactivate(id) {
    if (!window.confirm("Deactivate this user? They will no longer be able to log in.")) {
      return;
    }
    setDeactivateId(id);
    setDeactivateLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        await fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to deactivate user.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setDeactivateId(null);
      setDeactivateLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Users</h1>
        <p className={styles.subtitle}>Self-registered member accounts</p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>All Users</h2>
        <p className={styles.muted}>
          Users whose Discord account is missing or not in our server are likely mules — deactivate them here.{" "}
          <button type="button" className={styles.btnEdit} onClick={checkDiscord} disabled={discordChecking}>
            {discordChecking ? "Checking…" : "Check Discord"}
          </button>
        </p>
        {error && <p className={styles.errorText}>{error}</p>}
        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : users.length === 0 ? (
          <p className={styles.muted}>No users found.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Username (Real IGN)</th>
                <th>Member IGN</th>
                <th>Clan</th>
                <th>Discord</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.real_ign}</td>
                  <td>{user.member_ign}</td>
                  <td>{user.clan_name || "—"}</td>
                  <td>
                    {user.discord_user_id ? (
                      <span title={user.discord_user_id}>
                        {user.discord_username || user.discord_user_id}
                        {discordStatus[user.member_id] === "not_in_server" && <strong style={{ color: "#dc2626" }}> · not in server</strong>}
                        {discordStatus[user.member_id] === "in_server" && <span style={{ color: "#16a34a" }}> · in server</span>}
                        {discordStatus[user.member_id] === "error" && <span className={styles.muted}> · check failed</span>}
                      </span>
                    ) : (
                      <span className={styles.muted}>no Discord ID</span>
                    )}
                  </td>
                  <td>{user.status}</td>
                  <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</td>
                  <td>
                    <div className={styles.actions}>
                      {user.status === "active" ? (
                        <button
                          className={styles.btnDelete}
                          onClick={() => handleDeactivate(user.id)}
                          disabled={deactivateLoading && deactivateId === user.id}
                        >
                          {deactivateLoading && deactivateId === user.id ? "Deactivating…" : "Deactivate"}
                        </button>
                      ) : (
                        <span className={styles.muted}>Inactive</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
