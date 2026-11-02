"use client";

import { useMemo, useState } from "react";
import { DAY_NAMES } from "@/lib/weeks";
import { Modal } from "../../components/Modal";
import ui from "../../components/attendance-ui.module.css";
import styles from "./check-ss.module.css";

const MAX_PVP = 100000;
const MODES = [
  { value: "add", label: "Add (+)" },
  { value: "deduct", label: "Deduct (−)" },
  { value: "set", label: "Set to" },
];

export const formatPvp = (value) => (value > 0 ? `+${value}` : String(value));

// Adds, deducts or sets the signed PVP points of one member on one day. `aside` (e.g. a screenshot) is shown on the left.
export default function PvpModal({ sheet, initialMemberId = "", initialDayIndex = 0, aside = null, onClose, onSubmit }) {
  const sortedMembers = useMemo(() => [...sheet.members].sort((a, b) => a.ign.localeCompare(b.ign)), [sheet.members]);
  const [memberId, setMemberId] = useState(initialMemberId);
  const [dayIndex, setDayIndex] = useState(initialDayIndex);
  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState("add");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const q = filter.trim().toLowerCase();
  const options = sortedMembers.filter((m) => !q || m.ign.toLowerCase().includes(q) || m.id === memberId);
  const current = memberId === "" ? 0 : sheet.days[dayIndex]?.pvp?.[memberId] ?? 0;

  const number = value === "" ? null : Number(value);
  const validNumber = number !== null && Number.isInteger(number) && Math.abs(number) <= MAX_PVP && (mode === "set" || number >= 0);
  const next = !validNumber ? null : mode === "set" ? number : mode === "add" ? current + number : current - number;
  const valid = memberId !== "" && validNumber && Math.abs(next) <= MAX_PVP;

  async function submit(e) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        member_id: memberId,
        day_index: dayIndex,
        mode: mode === "set" ? "set" : "add",
        points: mode === "deduct" ? -number : number,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const form = (
    <form id="pvp-form" className={styles.tickForm} onSubmit={submit}>
      <label className={ui.label}>Member</label>
      <div className={styles.picker}>
        <input className={ui.input} placeholder="Search member…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select className={ui.select} value={memberId} onChange={(e) => setMemberId(e.target.value === "" ? "" : Number(e.target.value))} autoFocus={initialMemberId === ""}>
          <option value="">Select member…</option>
          {options.map((m) => (
            <option key={m.id} value={m.id}>{m.ign}</option>
          ))}
        </select>
      </div>

      <label className={ui.label} style={{ marginTop: 12 }}>Day</label>
      <select className={ui.select} value={dayIndex} onChange={(e) => setDayIndex(Number(e.target.value))}>
        {DAY_NAMES.map((name, i) => (
          <option key={name} value={i}>{name}</option>
        ))}
      </select>

      <label className={ui.label} style={{ marginTop: 12 }}>PVP points (kills + assists)</label>
      <div style={{ display: "flex", gap: 8 }}>
        <select className={ui.select} style={{ width: "auto" }} value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Action">
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <input
          type="number"
          step="1"
          min={mode === "set" ? -MAX_PVP : 0}
          max={MAX_PVP}
          className={ui.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 12"
          autoFocus={initialMemberId !== ""}
          required
        />
      </div>
      <p className={ui.hint}>
        {memberId === "" ? "Pick a member." : <>{DAY_NAMES[dayIndex]} PVP now: <b>{formatPvp(current)}</b>{next !== null && <> → <b>{formatPvp(next)}</b></>}</>}
      </p>
      {error && <p className={ui.errorText}>{error}</p>}
    </form>
  );

  return (
    <Modal
      title="PVP count"
      onClose={saving ? () => {} : onClose}
      wide={Boolean(aside)}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="pvp-form" className={ui.btnPrimary} disabled={saving || !valid}>{saving ? "Saving…" : "Save PVP"}</button>
        </>
      }
    >
      {aside ? (
        <div className={styles.tickLayout}>
          {aside}
          {form}
        </div>
      ) : (
        form
      )}
    </Modal>
  );
}
