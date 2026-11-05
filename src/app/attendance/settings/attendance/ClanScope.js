"use client";

import { useState } from "react";
import { Modal } from "../../components/Modal";
import ui from "../../components/attendance-ui.module.css";

export const SECTION_LABELS = {
  bosses: "Bosses",
  point_rules: "Point schemas",
  events: "Daily events",
  grades: "Grade thresholds & scores",
  general: "General",
};

const SECTION_IDS = Object.keys(SECTION_LABELS);

export function ClanScopeSelect({ clans, clanId, onChange }) {
  return (
    <div className={ui.field} style={{ maxWidth: 360, marginBottom: 12 }}>
      <label className={ui.label} htmlFor="settings-clan">Settings for</label>
      <select id="settings-clan" className={ui.select} value={clanId ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">Default (shared by clans without their own)</option>
        {clans.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}

// Shown above a tab while a clan is selected: whether that section is the clan's own or inherited from Default.
export function SectionBanner({ clanName, section, custom, busy, onCustomize, onCopy, onReset }) {
  const label = SECTION_LABELS[section];
  return (
    <div className={ui.card} style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
      <div>
        <b style={{ color: "var(--text)" }}>{custom ? `${clanName} has its own ${label}` : `${clanName} uses the Default ${label}`}</b>
        <p className={ui.muted} style={{ margin: "4px 0 0" }}>
          {custom
            ? "Changes here only affect this clan. Other clans and the Default are not touched."
            : "Read-only. Customize it to give this clan its own copy; until then it follows every change made to the Default."}
        </p>
      </div>
      <div className={ui.actions}>
        {!custom && (
          <button type="button" className={ui.btnPrimary} onClick={onCustomize} disabled={busy}>
            Customize (copy Default)
          </button>
        )}
        <button type="button" className={ui.btnGhost} onClick={onCopy} disabled={busy}>
          Copy from…
        </button>
        {custom && (
          <button type="button" className={ui.btnDelete} onClick={onReset} disabled={busy}>
            Reset to Default
          </button>
        )}
      </div>
    </div>
  );
}

export function CopyFromModal({ clan, clans, initialSection, onClose, onSubmit }) {
  const [source, setSource] = useState("");
  const [sections, setSections] = useState([initialSection]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (section) =>
    setSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]));

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await onSubmit({ from_clan_id: source ? Number(source) : null, sections });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Copy settings to ${clan.name}`}
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={ui.btnPrimary} onClick={submit} disabled={busy || sections.length === 0}>
            {busy ? "Copying…" : "Copy"}
          </button>
        </>
      }
    >
      <div className={ui.field} style={{ marginBottom: 12 }}>
        <label className={ui.label} htmlFor="copy-source">Copy from</label>
        <select id="copy-source" className={ui.select} value={source} onChange={(e) => setSource(e.target.value)} disabled={busy}>
          <option value="">Default</option>
          {clans.filter((c) => c.id !== clan.id).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className={ui.field} style={{ marginBottom: 12 }}>
        <span className={ui.label}>What to copy</span>
        {SECTION_IDS.map((section) => (
          <label key={section} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", color: "var(--text)" }}>
            <input type="checkbox" checked={sections.includes(section)} onChange={() => toggle(section)} disabled={busy} />
            {SECTION_LABELS[section]}
          </label>
        ))}
      </div>
      <p className={ui.muted}>
        The selected sections of {clan.name} are replaced by a copy of what the source uses right now and become {clan.name}&apos;s own.
        Attendances that already exist keep their entries, points and (if settled) grades.
      </p>
      {error && <p className={ui.errorText}>{error}</p>}
    </Modal>
  );
}
