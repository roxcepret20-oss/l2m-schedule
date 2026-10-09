"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "../../components/Modal";
import ui from "../../components/attendance-ui.module.css";
import { matchMember, readParticipantScreens } from "@/lib/participantOcr";
import styles from "./participants-modal.module.css";

const formatSize = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const STATUS_ICON = { pending: "•", working: "…", done: "✓", skipped: "!" };

export default function ParticipantsModal({ entry, clanName, members, tickedIds, onClose, onSubmit }) {
  const [stage, setStage] = useState("select"); // select | processing | review
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState({ fraction: 0, label: "" });
  const [imageStatus, setImageStatus] = useState({});
  const [skipped, setSkipped] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const abortRef = useRef(null);

  const sortedMembers = useMemo(() => [...members].sort((a, b) => a.ign.localeCompare(b.ign, undefined, { sensitivity: "base" })), [members]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const addFiles = (list) => {
    const images = [...list].filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setFiles((prev) => [...prev, ...images]);
    setError("");
  };

  useEffect(() => {
    if (stage !== "select") return;
    const onPaste = (e) => addFiles(e.clipboardData?.files ?? []);
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [stage]);

  async function startReading() {
    const controller = new AbortController();
    abortRef.current = controller;
    setStage("processing");
    setError("");
    setSkipped([]);
    setProgress({ fraction: 0, label: "Starting…" });
    setImageStatus(Object.fromEntries(files.map((_, i) => [i, "pending"])));
    try {
      const result = await readParticipantScreens({
        files,
        clanName,
        signal: controller.signal,
        onProgress: ({ fraction, label, imageIndex, imageStatus: status }) => {
          setProgress({ fraction, label });
          if (imageIndex >= 0 && status) setImageStatus((prev) => ({ ...prev, [imageIndex]: status }));
        },
      });
      setSkipped(result.skipped);
      setRows(
        result.names.map((name, i) => {
          const member = matchMember(name, members);
          return { key: i, name, memberId: member ? String(member.id) : "", checked: Boolean(member) };
        })
      );
      setStage("review");
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err?.message || "Could not read the screenshots.");
      setStage("select");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function cancelProcessing() {
    abortRef.current?.abort();
    setStage("select");
  }

  const updateRow = (key, patch) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const setMember = (key, memberId) => updateRow(key, { memberId, checked: memberId !== "" });

  const chosenIds = [...new Set(rows.filter((r) => r.checked && r.memberId).map((r) => Number(r.memberId)))];
  const newIds = chosenIds.filter((id) => !tickedIds.has(id));
  const unmatched = rows.filter((r) => !r.memberId).length;

  async function submit() {
    setSaving(true);
    try {
      await onSubmit(chosenIds);
    } catch (err) {
      setError(err?.message || "Could not save.");
      setSaving(false);
    }
  }

  const processing = stage === "processing";
  const percent = Math.round(progress.fraction * 100);

  return (
    <Modal
      title={`Import participants – ${entry.name}`}
      wide
      onClose={saving ? () => {} : processing ? cancelProcessing : onClose}
      footer={
        <>
          {stage === "review" && (
            <button type="button" className={`${ui.btnGhost} ${styles.footerLeft}`} onClick={() => { setStage("select"); setRows([]); }} disabled={saving}>
              ← Use other images
            </button>
          )}
          <button type="button" className={ui.btnGhost} onClick={processing ? cancelProcessing : onClose} disabled={saving}>Cancel</button>
          {stage === "select" && (
            <button type="button" className={ui.btnPrimary} onClick={startReading} disabled={files.length === 0}>
              Read {files.length || ""} {files.length === 1 ? "image" : "images"}
            </button>
          )}
          {stage === "review" && (
            <button type="button" className={ui.btnPrimary} onClick={submit} disabled={saving || chosenIds.length === 0}>
              {saving ? "Saving…" : `Tick ${chosenIds.length} ${chosenIds.length === 1 ? "member" : "members"}`}
            </button>
          )}
        </>
      }
    >
      {stage === "select" && (
        <>
          <p className={ui.muted} style={{ marginBottom: 10 }}>
            Add the <b>Participant</b> screenshots (16:9, e.g. 1440×810). Only members of <b>{clanName}</b> are picked up. Images are read in your browser and are never uploaded or stored.
          </p>
          <label
            className={`${styles.drop} ${dragging ? styles.dropActive : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          >
            <input type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <span className={styles.dropTitle}>Click to choose images, drop them here, or paste (Ctrl+V)</span>
            <span className={ui.muted}>Several screenshots of a long list are fine; duplicates are merged.</span>
          </label>
          {files.length > 0 && (
            <ul className={styles.fileList}>
              {files.map((file, i) => (
                <li key={`${file.name}-${i}`} className={styles.fileRow}>
                  <span className={styles.fileName}>{file.name || `Pasted image ${i + 1}`}</span>
                  <span className={ui.muted}>{formatSize(file.size)}</span>
                  <button type="button" className={styles.removeBtn} aria-label="Remove image" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>✕</button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className={ui.errorText}>{error}</p>}
        </>
      )}

      {processing && (
        <div aria-live="polite">
          <p className={styles.progressLabel}>{progress.label}</p>
          <div className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div className={styles.barFill} style={{ width: `${percent}%` }} />
          </div>
          <p className={ui.muted}>{percent}% · this runs on your device and can take a few seconds per image.</p>
          <ul className={styles.fileList}>
            {files.map((file, i) => {
              const status = imageStatus[i] ?? "pending";
              return (
                <li key={`${file.name}-${i}`} className={styles.fileRow}>
                  <span className={`${styles.statusIcon} ${styles[`status_${status}`]}`}>{STATUS_ICON[status]}</span>
                  <span className={styles.fileName}>{file.name || `Pasted image ${i + 1}`}</span>
                  <span className={ui.muted}>{status === "working" ? "Reading…" : status === "done" ? "Done" : status === "skipped" ? "Skipped" : "Waiting"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {stage === "review" && (
        <>
          <p className={ui.muted} style={{ marginBottom: 8 }}>
            Found <b>{rows.length}</b> {clanName} {rows.length === 1 ? "participant" : "participants"}
            {unmatched > 0 && <> · <span className={styles.warn}>{unmatched} not matched to a member – pick one or leave unticked</span></>}
            . Check the list, then tick them for <b>{entry.name}</b>.
          </p>
          {skipped.map((s) => (
            <p key={s.index} className={styles.warn}>{files[s.index]?.name || `Image ${s.index + 1}`}: {s.reason}</p>
          ))}
          {rows.length === 0 ? (
            <p className={ui.muted}>No {clanName} names were found. Check that the screenshots show the Participant list.</p>
          ) : (
            <div className={styles.results}>
              <div className={`${styles.resultRow} ${styles.resultHead}`}><span /><span>Read from image</span><span>Member</span><span /></div>
              {rows.map((row) => {
                const already = row.memberId && tickedIds.has(Number(row.memberId));
                return (
                  <div key={row.key} className={`${styles.resultRow} ${row.checked ? "" : styles.resultOff}`}>
                    <input type="checkbox" checked={row.checked} disabled={!row.memberId} onChange={(e) => updateRow(row.key, { checked: e.target.checked })} aria-label={`Tick ${row.name}`} />
                    <span className={styles.ocrName}>{row.name}</span>
                    <select className={`${ui.input} ${styles.memberSelect}`} value={row.memberId} onChange={(e) => setMember(row.key, e.target.value)} aria-label={`Member for ${row.name}`}>
                      <option value="">— not matched —</option>
                      {sortedMembers.map((m) => <option key={m.id} value={m.id}>{m.ign}</option>)}
                    </select>
                    <span className={ui.muted}>{already ? "already ticked" : ""}</span>
                  </div>
                );
              })}
            </div>
          )}
          {chosenIds.length > 0 && newIds.length < chosenIds.length && (
            <p className={ui.hint}>{chosenIds.length - newIds.length} of the selected members are already ticked; they stay ticked. Nobody is unticked.</p>
          )}
          {error && <p className={ui.errorText}>{error}</p>}
        </>
      )}
    </Modal>
  );
}
