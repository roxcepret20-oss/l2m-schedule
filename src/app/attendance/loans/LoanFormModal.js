"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/attendanceApi";
import { applyTaxChain, formatDiamonds } from "@/lib/money";
import { todayIso } from "@/lib/weeks";
import { Modal } from "../components/Modal";
import ui from "../components/attendance-ui.module.css";
import styles from "./loans.module.css";

// Create (loan = null) or edit a loan. Amount, member and taxes are locked once a payment exists.
export function LoanFormModal({ loan, attendances, members, taxes, onClose, onSaved }) {
  const locked = !!loan && loan.paid > 0;
  const [loanDate, setLoanDate] = useState(loan?.loan_date ?? todayIso());
  const [attendanceId, setAttendanceId] = useState(String(loan?.attendance.id ?? attendances[0]?.id ?? ""));
  const [memberId, setMemberId] = useState(String(loan?.member.id ?? ""));
  const [showAll, setShowAll] = useState(false);
  const [amount, setAmount] = useState(loan ? String(loan.amount) : "");
  const [note, setNote] = useState(loan?.note ?? "");
  // null = keep the loan's saved taxes untouched (edit mode); an array = the admin changed the selection.
  const [taxIds, setTaxIds] = useState(loan ? null : taxes.map((t) => t.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // The loan's own attendance may be inactive and therefore missing from the active list.
  const attendanceOptions =
    loan && !attendances.some((a) => a.id === loan.attendance.id)
      ? [{ id: loan.attendance.id, name: loan.attendance.name, clan_name: "inactive" }, ...attendances]
      : attendances;
  const attendance = attendanceOptions.find((a) => String(a.id) === attendanceId);
  const memberOptions = useMemo(() => {
    const list = showAll || !attendance ? members : members.filter((m) => m.clan_id === attendance.clan_id);
    if (loan && !list.some((m) => m.id === loan.member.id)) return [{ id: loan.member.id, ign: loan.member.ign }, ...list];
    return list;
  }, [members, attendance, showAll, loan]);
  const effectiveMemberId = memberOptions.some((m) => String(m.id) === memberId) ? memberId : String(memberOptions[0]?.id ?? "");

  const isChecked = (tax) => (taxIds ? taxIds.includes(tax.id) : loan.taxes.some((t) => t.tax_id === tax.id));
  function toggleTax(tax) {
    const current = taxIds ?? taxes.filter((t) => loan.taxes.some((x) => x.tax_id === t.id)).map((t) => t.id);
    setTaxIds(current.includes(tax.id) ? current.filter((id) => id !== tax.id) : [...current, tax.id]);
  }

  const amountNumber = Number(amount);
  const amountValid = /^\d+$/.test(amount.trim()) && amountNumber > 0;
  const previewTaxes = taxIds ? taxes.filter((t) => taxIds.includes(t.id)) : loan.taxes;
  const chain = amountValid ? applyTaxChain(amountNumber, previewTaxes) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      loan_date: loanDate,
      attendance_id: Number(attendanceId),
      member_id: Number(effectiveMemberId),
      amount: amountNumber,
      note: note.trim() || null,
    };
    if (taxIds) body.tax_ids = taxIds;
    try {
      const saved = loan
        ? await apiFetch(`/api/loans/${loan.id}`, { method: "PUT", body })
        : await apiFetch("/api/loans", { method: "POST", body: { ...body, tax_ids: taxIds } });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={loan ? "Edit loan" : "New loan"}
      wide
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="loan-form" className={ui.btnPrimary} disabled={saving || !amountValid || !attendanceId || !effectiveMemberId || !loanDate}>
            {saving ? "Saving…" : loan ? "Save" : "Create loan"}
          </button>
        </>
      }
    >
      <form id="loan-form" onSubmit={handleSubmit}>
        {locked && <p className={ui.hint} style={{ marginTop: 0, marginBottom: 14 }}>A payment was already recorded, so the amount, member and taxes can no longer change. Date, attendance and note can.</p>}
        <div className={ui.formRow}>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="loan-date">Loan date</label>
            <input id="loan-date" type="date" className={ui.input} value={loanDate} onChange={(e) => setLoanDate(e.target.value)} required />
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="loan-att">Attendance (reference)</label>
            <select id="loan-att" className={ui.select} value={attendanceId} onChange={(e) => setAttendanceId(e.target.value)} required>
              {attendanceOptions.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.clan_name})</option>
              ))}
            </select>
          </div>
        </div>
        <div className={ui.formRow}>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="loan-member">Member</label>
            <select id="loan-member" className={ui.select} value={effectiveMemberId} onChange={(e) => setMemberId(e.target.value)} disabled={locked} required>
              {memberOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.ign}</option>
              ))}
            </select>
            {!locked && (
              <label className={styles.checkRow} style={{ marginBottom: 0 }}>
                <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show members of all clans
              </label>
            )}
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="loan-amount">Total amount (diamonds)</label>
            <input id="loan-amount" type="number" min="1" step="1" className={ui.input} value={amount} onChange={(e) => setAmount(e.target.value)} disabled={locked} required />
          </div>
        </div>
        <div className={ui.field}>
          <span className={ui.label}>Taxes used</span>
          {taxes.length === 0 ? (
            <p className={ui.muted}>No taxes configured. Add them in Settings → Tax Settings.</p>
          ) : (
            taxes.map((tax) => (
              <label key={tax.id} className={styles.checkRow}>
                <input type="checkbox" checked={isChecked(tax)} onChange={() => toggleTax(tax)} disabled={locked} />
                {tax.name} ({tax.percent}%)
              </label>
            ))
          )}
        </div>
        <div className={styles.preview}>
          {chain ? (
            <>
              <div className={styles.taxRow}><span>Original</span><b>{formatDiamonds(amountNumber)}</b></div>
              {chain.steps.map((step, i) => (
                <div key={i} className={styles.taxRow}><span>− {step.name} {step.percent}%</span><span>−{formatDiamonds(step.amount)} → {formatDiamonds(step.after)}</span></div>
              ))}
              <div className={styles.taxRow}><b>After tax (clan gets)</b><b>{formatDiamonds(chain.net)}</b></div>
              <div className={ui.muted} style={{ fontSize: 12 }}>The member settles the loan by paying {formatDiamonds(amountNumber)}.</div>
            </>
          ) : (
            <span className={ui.muted}>Enter an amount to see the tax breakdown.</span>
          )}
        </div>
        <div className={ui.field} style={{ marginTop: 14 }}>
          <label className={ui.label} htmlFor="loan-note">Note (optional)</label>
          <input id="loan-note" className={ui.input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. Sword bought from clan warehouse" />
        </div>
        {error && <p className={ui.errorText}>{error}</p>}
      </form>
    </Modal>
  );
}
