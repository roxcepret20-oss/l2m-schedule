"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "../../components/Modal";
import ui from "../../components/attendance-ui.module.css";
import { applyTaxChain, formatDiamonds } from "@/lib/money";
import { readIncomeScreens } from "@/lib/incomeOcr";
import shared from "./participants-modal.module.css";
import styles from "./income-import-modal.module.css";

const formatSize = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const STATUS_ICON = { pending: "•", working: "…", done: "✓", skipped: "!" };
const isValidAmount = (value) => /^\d+$/.test(String(value).trim());
const rowIsValid = (row) => row.name.trim().length > 0 && isValidAmount(row.amount);

// editor.onCreate(body) saves one income item and throws on failure.
export default function IncomeImportModal({ taxes, onCreate, onClose }) {
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
  const nextKey = useRef(0);

  const sortedTaxes = useMemo(() => [...taxes].sort((a, b) => a.id - b.id), [taxes]);

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
      const result = await readIncomeScreens({
        files,
        signal: controller.signal,
        onProgress: ({ fraction, label, imageIndex, imageStatus: status }) => {
          setProgress({ fraction, label });
          if (imageIndex >= 0 && status) setImageStatus((prev) => ({ ...prev, [imageIndex]: status }));
        },
      });
      setSkipped(result.skipped);
      setRows(result.items.map((item) => ({ key: nextKey.current++, name: item.name, amount: String(item.amount), taxIds: [], checked: true })));
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
  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key));
  const toggleRowTax = (row, taxId) =>
    updateRow(row.key, { taxIds: row.taxIds.includes(taxId) ? row.taxIds.filter((id) => id !== taxId) : [...row.taxIds, taxId] });

  const allHave = (taxId) => rows.length > 0 && rows.every((r) => r.taxIds.includes(taxId));
  const toggleAllTax = (taxId) => {
    const on = !allHave(taxId);
    setRows((prev) => prev.map((r) => ({ ...r, taxIds: on ? [...new Set([...r.taxIds, taxId])] : r.taxIds.filter((id) => id !== taxId) })));
  };

  const afterTax = (row) => {
    if (!isValidAmount(row.amount)) return null;
    return applyTaxChain(Number(row.amount), sortedTaxes.filter((t) => row.taxIds.includes(t.id))).net;
  };

  const chosen = rows.filter((r) => r.checked);
  const invalid = chosen.filter((r) => !rowIsValid(r)).length;
  const totalOriginal = chosen.reduce((sum, r) => sum + (isValidAmount(r.amount) ? Number(r.amount) : 0), 0);
  const totalNet = chosen.reduce((sum, r) => sum + (afterTax(r) ?? 0), 0);

  // Saved rows leave the table, so after a failure the retry only sends what is still missing.
  async function submit() {
    setSaving(true);
    setError("");
    for (const row of chosen) {
      try {
        await onCreate({ name: row.name.trim(), amount: Number(row.amount), tax_ids: row.taxIds });
      } catch (err) {
        setError(`"${row.name}" could not be saved: ${err?.message || "unknown error"}. Fix it or untick it, then try again.`);
        setSaving(false);
        return;
      }
      setRows((prev) => prev.filter((r) => r.key !== row.key));
    }
    onClose();
  }

  const processing = stage === "processing";
  const percent = Math.round(progress.fraction * 100);

  return (
    <Modal
      title="Import income from screenshot"
      wide
      persistent
      onClose={saving ? () => {} : processing ? cancelProcessing : onClose}
      footer={
        <>
          {stage === "review" && (
            <button type="button" className={`${ui.btnGhost} ${shared.footerLeft}`} onClick={() => { setStage("select"); setRows([]); }} disabled={saving}>
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
            <button type="button" className={ui.btnPrimary} onClick={submit} disabled={saving || chosen.length === 0 || invalid > 0}>
              {saving ? "Saving…" : `Add ${chosen.length} ${chosen.length === 1 ? "item" : "items"}`}
            </button>
          )}
        </>
      }
    >
      {stage === "select" && (
        <>
          <p className={ui.muted} style={{ marginBottom: 10 }}>
            Add screenshots of <b>Clan → Distribute → Tally</b> (16:9, e.g. 1440×810). Only rows with status <b>Sold</b> are picked up. Images are read in your browser and are never uploaded or stored.
          </p>
          <label
            className={`${shared.drop} ${dragging ? shared.dropActive : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          >
            <input type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <span className={shared.dropTitle}>Click to choose images, drop them here, or paste (Ctrl+V)</span>
            <span className={ui.muted}>Several screenshots are fine. Make sure they do not overlap, or the same sale is listed twice.</span>
          </label>
          {files.length > 0 && (
            <ul className={shared.fileList}>
              {files.map((file, i) => (
                <li key={`${file.name}-${i}`} className={shared.fileRow}>
                  <span className={shared.fileName}>{file.name || `Pasted image ${i + 1}`}</span>
                  <span className={ui.muted}>{formatSize(file.size)}</span>
                  <button type="button" className={shared.removeBtn} aria-label="Remove image" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>✕</button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className={ui.errorText}>{error}</p>}
        </>
      )}

      {processing && (
        <div aria-live="polite">
          <p className={shared.progressLabel}>{progress.label}</p>
          <div className={shared.bar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div className={shared.barFill} style={{ width: `${percent}%` }} />
          </div>
          <p className={ui.muted}>{percent}% · this runs on your device and can take a few seconds per image.</p>
          <ul className={shared.fileList}>
            {files.map((file, i) => {
              const status = imageStatus[i] ?? "pending";
              return (
                <li key={`${file.name}-${i}`} className={shared.fileRow}>
                  <span className={`${shared.statusIcon} ${shared[`status_${status}`]}`}>{STATUS_ICON[status]}</span>
                  <span className={shared.fileName}>{file.name || `Pasted image ${i + 1}`}</span>
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
            Found <b>{rows.length}</b> sold {rows.length === 1 ? "item" : "items"}. Check the names and amounts, pick the taxes, then add them to the income.
          </p>
          {skipped.map((s) => (
            <p key={s.index} className={shared.warn}>{files[s.index]?.name || `Image ${s.index + 1}`}: {s.reason}</p>
          ))}
          {rows.length === 0 ? (
            <p className={ui.muted}>Nothing left to add.</p>
          ) : (
            <>
              {sortedTaxes.length > 0 && (
                <div className={styles.bulk}>
                  <span className={styles.bulkLabel}>Taxes for all rows:</span>
                  {sortedTaxes.map((tax) => (
                    <label key={tax.id} className={styles.taxCheck}>
                      <input type="checkbox" checked={allHave(tax.id)} onChange={() => toggleAllTax(tax.id)} disabled={saving} />
                      {tax.name} ({tax.percent}%)
                    </label>
                  ))}
                </div>
              )}
              <div className={styles.results}>
                {rows.map((row) => {
                  const net = afterTax(row);
                  return (
                    <div key={row.key} className={`${styles.row} ${row.checked ? "" : styles.rowOff}`}>
                      <input type="checkbox" checked={row.checked} disabled={saving} onChange={(e) => updateRow(row.key, { checked: e.target.checked })} aria-label={`Add ${row.name}`} />
                      <input className={ui.input} value={row.name} maxLength={100} disabled={saving} onChange={(e) => updateRow(row.key, { name: e.target.value })} aria-label="Item name" />
                      <input
                        className={`${ui.input} ${isValidAmount(row.amount) ? "" : styles.invalid}`}
                        type="number"
                        min="0"
                        step="1"
                        value={row.amount}
                        disabled={saving}
                        onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                        aria-label="Amount"
                      />
                      <div className={styles.taxes}>
                        {sortedTaxes.map((tax) => (
                          <label key={tax.id} className={styles.taxCheck}>
                            <input type="checkbox" checked={row.taxIds.includes(tax.id)} disabled={saving} onChange={() => toggleRowTax(row, tax.id)} />
                            {tax.name} {tax.percent}%
                          </label>
                        ))}
                      </div>
                      <span className={styles.net}>{net === null ? "–" : <>{formatDiamonds(net)} 💎</>}</span>
                      <button type="button" className={shared.removeBtn} aria-label="Remove row" disabled={saving} onClick={() => removeRow(row.key)}>✕</button>
                    </div>
                  );
                })}
              </div>
              <div className={styles.totals}>
                <span>Selected: <b>{chosen.length}</b></span>
                <span>Original: <b>{formatDiamonds(totalOriginal)}</b></span>
                <span>After tax: <b>{formatDiamonds(totalNet)} 💎</b></span>
              </div>
              {sortedTaxes.length === 0 && <p className={ui.hint}>No taxes configured. Add them in Settings → Tax Settings.</p>}
              {invalid > 0 && <p className={shared.warn}>{invalid} selected {invalid === 1 ? "row needs" : "rows need"} a name and a whole-number amount.</p>}
            </>
          )}
          {error && <p className={ui.errorText}>{error}</p>}
        </>
      )}
    </Modal>
  );
}
