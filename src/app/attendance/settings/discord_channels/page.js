"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/attendanceApi";
import styles from "../gear_score_formula/gear_score_formula.module.css";

const EMPTY_FORM = { clan_id: "", channel_id: "", label: "" };

export default function DiscordChannelsSettingsPage() {
  const [channels, setChannels] = useState([]);
  const [clans, setClans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [channelRows, clanRows] = await Promise.all([apiFetch("/api/discord/report-channels"), apiFetch("/api/clans")]);
      setChannels(channelRows);
      setClans(clanRows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/discord/report-channels", {
        method: "POST",
        body: { clan_id: Number(form.clan_id), channel_id: form.channel_id.trim(), label: form.label.trim() },
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(channel) {
    if (!window.confirm(`Remove "${channel.label}" from ${channel.clan_name}?`)) return;
    setDeletingId(channel.id);
    setError("");
    try {
      await apiFetch(`/api/discord/report-channels/${channel.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Discord Channels</h1>
        <p className={styles.subtitle}>
          Channels where members post screenshots (miss-hits, event attendance). They appear in the attendance &quot;Check SS&quot; tab of the matching clan.
        </p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Add channel</h2>
        <form className={styles.addForm} onSubmit={handleAdd}>
          <select
            className={styles.input}
            value={form.clan_id}
            onChange={(e) => setForm((f) => ({ ...f, clan_id: e.target.value }))}
            required
          >
            <option value="">Clan…</option>
            {clans.map((clan) => (
              <option key={clan.id} value={clan.id}>
                {clan.name}
              </option>
            ))}
          </select>
          <input
            className={styles.input}
            placeholder="Channel ID (right-click channel → Copy Channel ID)"
            inputMode="numeric"
            value={form.channel_id}
            onChange={(e) => setForm((f) => ({ ...f, channel_id: e.target.value.replace(/\D/g, "").slice(0, 20) }))}
            required
          />
          <input
            className={styles.input}
            placeholder="Label (e.g. #miss-hit)"
            maxLength={80}
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            required
          />
          <button type="submit" className={styles.btnPrimary} disabled={saving || !form.clan_id || form.channel_id.length < 17 || !form.label.trim()}>
            {saving ? "Adding…" : "Add"}
          </button>
        </form>
        <p className={styles.muted}>The bot needs View Channel and Read Message History on the channel.</p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Configured channels</h2>
        {error && <p className={styles.errorText}>{error}</p>}
        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : channels.length === 0 ? (
          <p className={styles.muted}>No channels configured yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Clan</th>
                <th>Label</th>
                <th>Channel ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((channel) => (
                <tr key={channel.id}>
                  <td>{channel.clan_name}</td>
                  <td>{channel.label}</td>
                  <td>{channel.channel_id}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.btnDelete} onClick={() => handleDelete(channel)} disabled={deletingId === channel.id}>
                        {deletingId === channel.id ? "Removing…" : "Remove"}
                      </button>
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
