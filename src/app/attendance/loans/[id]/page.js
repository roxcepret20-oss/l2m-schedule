"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/attendanceApi";
import { formatDiamonds, netReceived } from "@/lib/money";
import { formatShortDate, todayIso } from "@/lib/weeks";
import { Modal, ConfirmModal } from "../../components/Modal";
import ui from "../../components/attendance-ui.module.css";
import styles from "../loans.module.css";
import { LoanFormModal } from "../LoanFormModal";

export default function LoanDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      setLoan(await apiFetch(`/api/loans/${id}`));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function openEdit() {
    setActionError("");
    try {
      if (!options) {
        const [attendances, members, taxes] = await Promise.all([apiFetch("/api/attendances"), apiFetch("/api/members"), apiFetch("/api/loan-taxes")]);
        setOptions({ attendances, members, taxes });
      }
      setModal({ type: "edit" });
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function removeLoan() {
    setBusy(true);
    try {
      await apiFetch(`/api/loans/${id}`, { method: "DELETE" });
      router.push("/attendance/loans");
    } catch (err) {
      setActionError(err.message);
      setModal(null);
      setBusy(false);
    }
  }

  async function removePayment(payment) {
    setBusy(true);
    try {
      setLoan(await apiFetch(`/api/loans/${id}/payments/${payment.id}`, { method: "DELETE" }));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
      setModal(null);
    }
  }

  if (loading) return <div className={ui.page}><p className={ui.muted}>Loading…</p></div>;
  if (loadError || !loan) {
    return (
      <div className={ui.page}>
        <Link href="/attendance/loans" className={ui.backLink}>← Loans</Link>
        <div className={ui.banner}>{loadError || "Loan not found."}</div>
      </div>
    );
  }

  const inactive = loan.status === "inactive";
  const percentPaid = Math.min(100, Math.round((loan.paid / loan.amount) * 100));

  return (
    <div className={ui.page}>
      <div className={ui.header}>
        <div>
          <Link href="/attendance/loans" className={ui.backLink}>← Loans</Link>
          <h1 className={ui.title}>{loan.member.ign} – {formatDiamonds(loan.amount)} 💎</h1>
          <p className={ui.subtitle}>
            {formatShortDate(loan.loan_date)} · {loan.attendance.name} · <span className={`${ui.badge} ${styles[`status_${loan.status}`]}`}>{loan.status}</span>
            {loan.note ? ` · ${loan.note}` : ""}
          </p>
        </div>
        {!inactive && (
          <div className={ui.actions}>
            <button className={ui.btnPrimary} onClick={() => setModal({ type: "pay" })} disabled={loan.remaining === 0}>+ Add payment</button>
            <button className={ui.btnGhost} onClick={openEdit}>Edit</button>
            <button className={ui.btnDelete} onClick={() => setModal({ type: "delete" })}>Delete</button>
          </div>
        )}
      </div>

      {actionError && (
        <div className={ui.banner}>
          <span>{actionError}</span>
          <button className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setActionError("")}>Dismiss</button>
        </div>
      )}
      {inactive && <div className={ui.hint} style={{ marginBottom: 14 }}>This loan is deleted (inactive). It is read-only.</div>}

      <div className={ui.stats}>
        <div className={ui.stat}><span>Original amount</span><b>{formatDiamonds(loan.amount)}</b></div>
        <div className={ui.stat}><span>After tax (clan gets)</span><b>{formatDiamonds(loan.after_tax)}</b></div>
        <div className={ui.stat}><span>Member paid</span><b>{formatDiamonds(loan.paid)}</b></div>
        <div className={ui.stat}><span>Remaining (member owes)</span><b className={loan.remaining ? styles.negative : styles.positive}>{formatDiamonds(loan.remaining)}</b></div>
        <div className={ui.stat}><span>Clan received so far</span><b>{formatDiamonds(loan.net_received)}</b></div>
      </div>

      <div className={ui.card}>
        <h2 className={ui.sectionTitle} style={{ marginBottom: 10 }}>Taxes used</h2>
        {loan.taxes.length === 0 ? (
          <p className={ui.muted}>No tax used.</p>
        ) : (
          <>
            {loan.taxes.map((tax, i) => (
              <div key={i} className={styles.taxRow}><span>{tax.name} ({tax.percent}%)</span><span>−{formatDiamonds(tax.amount)} → {formatDiamonds(tax.after)}</span></div>
            ))}
            <div className={styles.taxRow}><b>Total tax</b><b>−{formatDiamonds(loan.tax_total)}</b></div>
          </>
        )}
      </div>

      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <h2 className={ui.sectionTitle}>Payments</h2>
          <span className={ui.muted}>{formatDiamonds(loan.paid)} / {formatDiamonds(loan.amount)} ({percentPaid}%)</span>
        </div>
        <div className={styles.progress}><span className={styles.progressBar} style={{ width: `${percentPaid}%` }} /></div>
        {loan.payments.length === 0 ? (
          <p className={ui.muted}>No payments yet.</p>
        ) : (
          <div className={ui.tableWrapper}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Payment date</th>
                  <th className={ui.num}>Member paid</th>
                  <th className={ui.num}>Clan gets (after tax)</th>
                  <th>Note</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loan.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatShortDate(p.paid_at)}</td>
                    <td className={ui.num}>{formatDiamonds(p.amount)}</td>
                    <td className={ui.num}>{formatDiamonds(p.net_received)}</td>
                    <td className={ui.mutedCell}>{p.note || "—"}</td>
                    <td className={ui.num}>
                      {!inactive && <button className={ui.btnDelete} onClick={() => setModal({ type: "deletePayment", payment: p })}>Delete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className={ui.num}>{formatDiamonds(loan.paid)}</td>
                  <td className={ui.num}>{formatDiamonds(loan.net_received)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className={ui.hint}>
          The member settles the loan by paying the original amount. “Clan gets” applies the loan&apos;s taxes in order to the cumulative amount paid, so a fully paid loan equals the after-tax amount exactly.
        </p>
      </div>

      {modal?.type === "pay" && (
        <PaymentModal
          loan={loan}
          onClose={() => setModal(null)}
          onSaved={(updated) => {
            setLoan(updated);
            setModal(null);
          }}
        />
      )}
      {modal?.type === "edit" && options && (
        <LoanFormModal
          loan={loan}
          attendances={options.attendances}
          members={options.members}
          taxes={options.taxes}
          onClose={() => setModal(null)}
          onSaved={(updated) => {
            setLoan(updated);
            setModal(null);
          }}
        />
      )}
      {modal?.type === "delete" && (
        <ConfirmModal title="Delete this loan?" message="It is marked inactive and hidden from the list. Its payments are kept." confirmLabel="Delete" danger busy={busy} onConfirm={removeLoan} onClose={() => setModal(null)} />
      )}
      {modal?.type === "deletePayment" && (
        <ConfirmModal
          title="Delete this payment?"
          message={`The payment of ${formatDiamonds(modal.payment.amount)} is removed and the remaining amount increases.`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={() => removePayment(modal.payment)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function PaymentModal({ loan, onClose, onSaved }) {
  const [paidAt, setPaidAt] = useState(todayIso());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const amountNumber = Number(amount);
  const amountValid = /^\d+$/.test(amount.trim()) && amountNumber > 0;
  const tooMuch = amountValid && amountNumber > loan.remaining;
  const clanGets = amountValid && !tooMuch
    ? netReceived(loan.paid + amountNumber, loan.taxes) - netReceived(loan.paid, loan.taxes)
    : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      onSaved(await apiFetch(`/api/loans/${loan.id}/payments`, { method: "POST", body: { paid_at: paidAt, amount: amountNumber, note: note.trim() || null } }));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add payment"
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={ui.btnGhost} style={{ marginRight: "auto" }} onClick={() => setAmount(String(loan.remaining))} disabled={saving}>Pay full remaining</button>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="payment-form" className={ui.btnPrimary} disabled={saving || !amountValid || tooMuch || !paidAt}>{saving ? "Saving…" : "Save payment"}</button>
        </>
      }
    >
      <form id="payment-form" onSubmit={handleSubmit}>
        <p className={ui.muted} style={{ marginBottom: 12 }}>Remaining: {formatDiamonds(loan.remaining)} (a payment cannot be more than this).</p>
        <div className={ui.formRow}>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="pay-date">Payment date</label>
            <input id="pay-date" type="date" className={ui.input} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="pay-amount">Amount paid</label>
            <input id="pay-amount" type="number" min="1" step="1" className={ui.input} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
          </div>
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="pay-note">Note (optional)</label>
          <input id="pay-note" className={ui.input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
        <div className={styles.preview}>
          {tooMuch ? (
            <span className={styles.negative}>The amount is more than the remaining {formatDiamonds(loan.remaining)}.</span>
          ) : clanGets !== null ? (
            <>Member pays <b>{formatDiamonds(amountNumber)}</b> → clan gets <b>{formatDiamonds(clanGets)}</b> after tax. Remaining after this: <b>{formatDiamonds(loan.remaining - amountNumber)}</b></>
          ) : (
            <span className={ui.muted}>Enter the amount the member paid.</span>
          )}
        </div>
        {error && <p className={ui.errorText}>{error}</p>}
      </form>
    </Modal>
  );
}
