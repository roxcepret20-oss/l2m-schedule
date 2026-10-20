"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/attendanceApi";
import { DAY_NAMES } from "@/lib/weeks";
import { Modal } from "../../components/Modal";
import ui from "../../components/attendance-ui.module.css";
import styles from "./check-ss.module.css";

const AUTO_REFRESH_AFTER_MS = 60 * 1000;

const isImage = (a) => (a.content_type ? a.content_type.startsWith("image/") : /\.(png|jpe?g|gif|webp)$/i.test(a.filename || ""));

const formatWhen = (iso) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

// Bosses first (by time), events last, same order as the tick grid.
const byBossThenEvent = (a, b) => (a.kind === "event") - (b.kind === "event") || a.time.localeCompare(b.time) || a.id - b.id;

const reviewedKey = (attendanceId) => `check_ss_reviewed_${attendanceId}`;
const channelKey = (clanId) => `check_ss_channel_${clanId}`;

function readReviewed(attendanceId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(reviewedKey(attendanceId)) || "[]"));
  } catch {
    return new Set();
  }
}

function mergeById(existing, incoming) {
  const seen = new Set(existing.map((m) => m.id));
  return [...existing, ...incoming.filter((m) => !seen.has(m.id))];
}

export default function CheckSsView({ attendanceId, clanId, sheet, readOnly, onTick }) {
  const [channels, setChannels] = useState(null);
  const [channelId, setChannelId] = useState("");
  const [messages, setMessages] = useState([]);
  const [nextBefore, setNextBefore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [day, setDay] = useState("all");
  const [imagesOnly, setImagesOnly] = useState(true);
  const [hideReviewed, setHideReviewed] = useState(false);
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [tickMessage, setTickMessage] = useState(null);
  const [linkMessage, setLinkMessage] = useState(null);
  const [reviewed, setReviewed] = useState(() => readReviewed(attendanceId));

  const requestRef = useRef(0);
  const lastLoadRef = useRef(0);
  const imageRetryRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/discord/report-channels?clan_id=${clanId}`)
      .then((list) => {
        if (cancelled) return;
        setChannels(list);
        const saved = localStorage.getItem(channelKey(clanId));
        setChannelId((list.find((c) => c.channel_id === saved) ?? list[0])?.channel_id ?? "");
      })
      .catch((err) => {
        if (cancelled) return;
        setChannels([]);
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [clanId]);

  const loadMessages = useCallback(
    async ({ before = null, silent = false } = {}) => {
      if (!channelId) return;
      const request = ++requestRef.current;
      if (before) setLoadingMore(true);
      else if (!silent) setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({ channel_id: channelId });
        if (before) query.set("before", before);
        const data = await apiFetch(`/api/attendances/${attendanceId}/discord-messages?${query}`);
        if (request !== requestRef.current) return;
        setMessages((prev) => (before ? mergeById(prev, data.messages) : data.messages));
        setNextBefore(data.next_before);
        lastLoadRef.current = Date.now();
        imageRetryRef.current = false;
      } catch (err) {
        if (request === requestRef.current) setError(err.message);
      } finally {
        if (request === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [attendanceId, channelId]
  );

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Discord image links expire, so refresh when the admin comes back to this tab after a while.
  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastLoadRef.current > AUTO_REFRESH_AFTER_MS) loadMessages({ silent: true });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadMessages]);

  function pickChannel(value) {
    setMessages([]);
    setNextBefore(null);
    setChannelId(value);
    localStorage.setItem(channelKey(clanId), value);
  }

  function toggleReviewed(messageId) {
    setReviewed((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      localStorage.setItem(reviewedKey(attendanceId), JSON.stringify([...next]));
      return next;
    });
  }

  function markReviewed(messageId) {
    if (!reviewed.has(messageId)) toggleReviewed(messageId);
  }

  function onImageError() {
    if (imageRetryRef.current) return;
    imageRetryRef.current = true;
    loadMessages({ silent: true });
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (day !== "all" && m.day_index !== Number(day)) return false;
      if (imagesOnly && !m.attachments.some(isImage)) return false;
      if (hideReviewed && reviewed.has(m.id)) return false;
      if (!q) return true;
      return m.author.name.toLowerCase().includes(q) || m.content.toLowerCase().includes(q) || (m.member?.ign ?? "").toLowerCase().includes(q);
    });
  }, [messages, day, imagesOnly, hideReviewed, reviewed, search]);

  const memberIds = useMemo(() => new Set(sheet.members.map((m) => m.id)), [sheet.members]);

  if (channels === null) return <p className={ui.muted}>Loading…</p>;

  if (channels.length === 0) {
    return (
      <div className={ui.card}>
        <p className={ui.muted}>
          {error || "No Discord channels are configured for this clan yet. Add them under Settings → Discord Channels."}
        </p>
      </div>
    );
  }

  return (
    <div className={ui.card}>
      <div className={styles.toolbar}>
        <select className={ui.select} value={channelId} onChange={(e) => pickChannel(e.target.value)} aria-label="Discord channel">
          {channels.map((c) => (
            <option key={c.id} value={c.channel_id}>
              {c.label}
            </option>
          ))}
        </select>
        <select className={ui.select} value={day} onChange={(e) => setDay(e.target.value)} aria-label="Day">
          <option value="all">All days</option>
          {DAY_NAMES.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
        <input className={ui.input} placeholder="Search name or text…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className={styles.check}>
          <input type="checkbox" checked={imagesOnly} onChange={(e) => setImagesOnly(e.target.checked)} /> Images only
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={hideReviewed} onChange={(e) => setHideReviewed(e.target.checked)} /> Hide reviewed
        </label>
        <button type="button" className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => loadMessages()} disabled={loading}>
          ↻ Refresh
        </button>
      </div>

      {error && <p className={ui.errorText}>{error}</p>}
      {loading ? (
        <p className={ui.muted}>Loading messages…</p>
      ) : visible.length === 0 ? (
        <p className={ui.muted}>
          {messages.length === 0 ? "No messages in this channel for this week." : "No messages match the filters."}
        </p>
      ) : (
        <ul className={styles.feed}>
          {visible.map((m) => {
            const done = reviewed.has(m.id);
            const inSheet = m.member && memberIds.has(m.member.id);
            return (
              <li key={m.id} className={`${styles.message} ${done ? styles.messageDone : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.avatar} src={m.author.avatar_url} alt="" width={36} height={36} loading="lazy" />
                <div className={styles.body}>
                  <div className={styles.meta}>
                    <b>{m.author.name}</b>
                    {m.member ? (
                      <span className={`${styles.chip} ${inSheet ? styles.chipOk : styles.chipWarn}`} title={inSheet ? "Linked member" : "Linked member, but not in this clan's roster"}>
                        {m.member.ign}
                      </span>
                    ) : (
                      <span className={`${styles.chip} ${styles.chipMuted}`}>not linked</span>
                    )}
                    <span className={styles.when}>{formatWhen(m.timestamp)}</span>
                  </div>
                  {m.reply_to && (
                    <div className={styles.reply}>
                      ↪ {m.reply_to.author}: {m.reply_to.content}
                    </div>
                  )}
                  {m.content && <p className={styles.text}>{m.content}</p>}
                  {m.attachments.length > 0 && (
                    <div className={styles.images}>
                      {m.attachments.map((a) =>
                        isImage(a) ? (
                          <button key={a.id} type="button" className={styles.thumbBtn} onClick={() => setLightbox(a.url)} title={a.filename}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img className={styles.thumb} src={a.url} alt={a.filename} loading="lazy" onError={onImageError} />
                          </button>
                        ) : (
                          <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className={styles.file}>
                            📎 {a.filename}
                          </a>
                        )
                      )}
                    </div>
                  )}
                  <div className={styles.actions}>
                    {!readOnly && (
                      <button type="button" className={`${ui.btnPrimary} ${ui.btnSm}`} onClick={() => setTickMessage(m)}>
                        ✓ Tick
                      </button>
                    )}
                    {!m.member && !readOnly && (
                      <button type="button" className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setLinkMessage(m)}>
                        Link member
                      </button>
                    )}
                    <button type="button" className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => toggleReviewed(m.id)}>
                      {done ? "Reviewed ✓ (undo)" : "Mark reviewed"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {nextBefore && !loading && (
        <div className={styles.more}>
          <button type="button" className={ui.btnGhost} onClick={() => loadMessages({ before: nextBefore })} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load older messages"}
          </button>
        </div>
      )}

      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)} role="dialog" aria-modal="true" aria-label="Screenshot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Screenshot" className={styles.lightboxImg} />
        </div>
      )}

      {tickMessage && (
        <TickModal
          message={tickMessage}
          sheet={sheet}
          onClose={() => setTickMessage(null)}
          onConfirm={(memberId, entryIds) => {
            onTick(memberId, entryIds);
            markReviewed(tickMessage.id);
            setTickMessage(null);
          }}
        />
      )}

      {linkMessage && (
        <LinkModal
          message={linkMessage}
          members={sheet.members}
          onClose={() => setLinkMessage(null)}
          onLinked={() => {
            setLinkMessage(null);
            loadMessages({ silent: true });
          }}
        />
      )}
    </div>
  );
}

function MemberPicker({ members, value, onChange }) {
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();
  const options = members.filter((m) => !q || m.ign.toLowerCase().includes(q) || m.id === value);
  return (
    <div className={styles.picker}>
      <input className={ui.input} placeholder="Search member…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <select className={ui.select} value={value} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}>
        <option value="">Select member…</option>
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.ign}
          </option>
        ))}
      </select>
    </div>
  );
}

function MessagePreview({ message }) {
  return (
    <div className={styles.preview}>
      <p className={styles.previewMeta}>
        <b>{message.author.name}</b> · {formatWhen(message.timestamp)}
      </p>
      {message.content && <p className={styles.text}>{message.content}</p>}
      {message.attachments.filter(isImage).map((a) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={a.id} src={a.url} alt={a.filename} className={styles.previewImg} />
      ))}
    </div>
  );
}

function TickModal({ message, sheet, onClose, onConfirm }) {
  const sortedMembers = useMemo(() => [...sheet.members].sort((a, b) => a.ign.localeCompare(b.ign)), [sheet.members]);
  const initialMember = message.member && sheet.members.some((m) => m.id === message.member.id) ? message.member.id : "";
  const [memberId, setMemberId] = useState(initialMember);
  const [dayIndex, setDayIndex] = useState(message.day_index);
  const [selected, setSelected] = useState(() => new Set());

  const entries = useMemo(() => [...(sheet.days[dayIndex]?.entries ?? [])].sort(byBossThenEvent), [sheet.days, dayIndex]);
  const alreadyTicked = (entry) => memberId !== "" && entry.member_ids.includes(memberId);

  function toggle(entryId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }

  const chosen = entries.filter((e) => selected.has(e.id) && !alreadyTicked(e));

  return (
    <Modal
      title="Tick from screenshot"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={ui.btnPrimary} disabled={memberId === "" || chosen.length === 0} onClick={() => onConfirm(memberId, chosen.map((e) => e.id))}>
            Tick {chosen.length > 0 ? `${chosen.length} ` : ""}entr{chosen.length === 1 ? "y" : "ies"}
          </button>
        </>
      }
    >
      <div className={styles.tickLayout}>
        <MessagePreview message={message} />
        <div className={styles.tickForm}>
          <label className={ui.label}>Member</label>
          <MemberPicker members={sortedMembers} value={memberId} onChange={setMemberId} />
          {!message.member && <p className={ui.muted}>This Discord user is not linked to a member yet. Pick who it is, or close and use “Link member”.</p>}

          <label className={ui.label} style={{ marginTop: 12 }}>Day</label>
          <select className={ui.select} value={dayIndex} onChange={(e) => { setDayIndex(Number(e.target.value)); setSelected(new Set()); }}>
            {DAY_NAMES.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>

          <label className={ui.label} style={{ marginTop: 12 }}>Bosses / events</label>
          {entries.length === 0 ? (
            <p className={ui.muted}>Nothing scheduled on {DAY_NAMES[dayIndex]}.</p>
          ) : (
            <ul className={styles.entryList}>
              {entries.map((entry) => {
                const ticked = alreadyTicked(entry);
                return (
                  <li key={entry.id}>
                    <label className={`${styles.entryRow} ${ticked ? styles.entryTicked : ""}`}>
                      <input type="checkbox" checked={ticked || selected.has(entry.id)} disabled={ticked} onChange={() => toggle(entry.id)} />
                      <span className={styles.entryTime}>{entry.time}</span>
                      <span>
                        {entry.kind === "event" ? "★ " : ""}
                        {entry.name}
                        {entry.server === "invasion" ? " (invasion)" : ""}
                      </span>
                      <span className={styles.entryPoints}>{ticked ? "✓ ticked" : `${entry.points} pts`}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function LinkModal({ message, members, onClose, onLinked }) {
  const sorted = useMemo(() => [...members].sort((a, b) => a.ign.localeCompare(b.ign)), [members]);
  const [memberId, setMemberId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/api/discord/members/${memberId}`, { method: "PUT", body: { discord_user_id: message.author.id } });
      onLinked();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Link ${message.author.name}`}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={ui.btnPrimary} onClick={save} disabled={saving || memberId === ""}>
            {saving ? "Linking…" : "Link"}
          </button>
        </>
      }
    >
      <p className={ui.muted} style={{ marginBottom: 12 }}>
        Links Discord user <b>{message.author.name}</b> ({message.author.id}) to a member, so their messages are matched automatically from now on.
      </p>
      <MemberPicker members={sorted} value={memberId} onChange={setMemberId} />
      {error && <p className={ui.errorText}>{error}</p>}
    </Modal>
  );
}
