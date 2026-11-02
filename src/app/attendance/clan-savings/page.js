"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/attendanceApi";
import { formatDiamonds } from "@/lib/money";
import { formatShortDate } from "@/lib/weeks";
import { ConfirmModal } from "../components/Modal";
import ui from "../components/attendance-ui.module.css";
import styles from "./clan-savings.module.css";
import { AssignModal, HistoryModal, ItemActionModal, ItemFormModal, SavingFormModal } from "./ClanSavingsModals";

const CLAN_KEY = "clan_savings_clan";
const ITEM_FILTERS = [
  { value: "", label: "All items" },
  { value: "free", label: "Free" },
  { value: "assigned", label: "Assigned" },
  { value: "sold", label: "Sold" },
];

export default function ClanSavingsPage() {
  const [clans, setClans] = useState([]);
  const [members, setMembers] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [clanId, setClanId] = useState("");
  const [tab, setTab] = useState("savings");
  const [savings, setSavings] = useState([]);
  const [summary, setSummary] = useState({ balance: 0, total_deposited: 0, total_spent: 0 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [itemStatus, setItemStatus] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch("/api/clans"), apiFetch("/api/members"), apiFetch("/api/loan-taxes")])
      .then(([c, m, t]) => {
        setClans(c);
        setMembers(m);
        setTaxes([...t].sort((a, b) => a.id - b.id));
        const saved = localStorage.getItem(CLAN_KEY);
        setClanId(String((c.find((x) => String(x.id) === saved) ?? c[0])?.id ?? ""));
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const clan = clans.find((c) => String(c.id) === clanId) ?? null;
  const clanMembers = useMemo(
    () => members.filter((m) => m.clan_id === clan?.id).sort((a, b) => a.ign.localeCompare(b.ign)),
    [members, clan]
  );

  const load = useCallback(async () => {
    if (!clanId) return;
    setLoading(true);
    setError("");
    try {
      const [savingData, itemData] = await Promise.all([
        apiFetch(`/api/clan-savings?clan_id=${clanId}`),
        apiFetch(`/api/clan-savings/items?clan_id=${clanId}`),
      ]);
      setSavings(savingData.savings);
      setSummary(savingData.summary);
      setItems(itemData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clanId]);

  useEffect(() => {
    load();
  }, [load]);

  function pickClan(value) {
    setClanId(value);
    localStorage.setItem(CLAN_KEY, value);
  }

  const saved = () => {
    setModal(null);
    load();
  };

  async function runDelete() {
    setBusy(true);
    try {
      const path = modal.type === "deleteSaving" ? `/api/clan-savings/${modal.saving.id}` : `/api/clan-savings/items/${modal.item.id}`;
      await apiFetch(path, { method: "DELETE" });
      setModal(null);
      await load();
    } catch (err) {
      setModal(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const q = search.trim().toLowerCase();
  const visibleSavings = savings.filter((s) => !q || s.member.ign.toLowerCase().includes(q) || (s.note ?? "").toLowerCase().includes(q));
  const visibleItems = items.filter(
    (i) =>
      (!itemStatus || i.status === itemStatus) &&
      (!q || i.name.toLowerCase().includes(q) || (i.assigned_member?.ign ?? "").toLowerCase().includes(q))
  );
  const count = (status) => items.filter((i) => i.status === status).length;

  return (
    <div className={ui.page}>
      <div className={ui.header}>
        <div>
          <h1 className={ui.title}>Clan Savings</h1>
          <p className={ui.subtitle}>Diamonds saved for the clan, and the items bought with them</p>
        </div>
        <div className={styles.filters}>
          <select className={ui.select} style={{ width: "auto" }} value={clanId} onChange={(e) => pickClan(e.target.value)} aria-label="Clan">
            {clans.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {clan && tab === "savings" && (
            <button className={ui.btnPrimary} onClick={() => setModal({ type: "saving", saving: null })}>+ New saving</button>
          )}
          {clan && tab === "items" && (
            <button className={ui.btnPrimary} onClick={() => setModal({ type: "item", item: null })} disabled={summary.balance <= 0} title={summary.balance <= 0 ? "No savings to withdraw" : undefined}>
              − Withdraw for item
            </button>
          )}
        </div>
      </div>

      <div className={ui.stats}>
        <div className={ui.stat}><span>Balance available</span><b>{formatDiamonds(summary.balance)} 💎</b></div>
        <div className={ui.stat}><span>Total saved (before tax)</span><b>{formatDiamonds(summary.total_deposited)} 💎</b></div>
        <div className={ui.stat}><span>Taxes paid</span><b>{formatDiamonds(summary.total_tax)} 💎</b></div>
        <div className={ui.stat}><span>Spent on items</span><b>{formatDiamonds(summary.total_spent)} 💎</b></div>
        <div className={ui.stat}><span>Items (free · assigned · sold)</span><b>{count("free")} · {count("assigned")} · {count("sold")}</b></div>
      </div>

      <div className={ui.tabs} role="tablist">
        <button role="tab" aria-selected={tab === "savings"} className={`${ui.tab} ${tab === "savings" ? ui.tabActive : ""}`} onClick={() => setTab("savings")}>Savings</button>
        <button role="tab" aria-selected={tab === "items"} className={`${ui.tab} ${tab === "items" ? ui.tabActive : ""}`} onClick={() => setTab("items")}>Items</button>
      </div>

      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <h2 className={ui.sectionTitle}>{tab === "savings" ? "Saving records" : "Items bought from savings"}</h2>
          <div className={styles.filters}>
            {tab === "items" && (
              <select className={`${ui.select} ${ui.inputSm}`} style={{ width: "auto" }} value={itemStatus} onChange={(e) => setItemStatus(e.target.value)} aria-label="Filter by status">
                {ITEM_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            )}
            <input className={`${ui.input} ${ui.inputSm} ${styles.filterSearch}`} placeholder={tab === "savings" ? "Search member / notes…" : "Search item / member…"} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
          </div>
        </div>

        {error && <div className={ui.banner}>{error}</div>}

        {loading ? (
          <p className={ui.muted}>Loading…</p>
        ) : tab === "savings" ? (
          visibleSavings.length === 0 ? (
            <p className={ui.muted}>No savings found.</p>
          ) : (
            <div className={ui.tableWrapper}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Member</th>
                    <th className={ui.num}>Amount</th>
                    <th>Taxes</th>
                    <th className={ui.num}>Added to savings</th>
                    <th>Notes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleSavings.map((s) => (
                    <tr key={s.id}>
                      <td>{formatShortDate(s.saving_date)}</td>
                      <td><b>{s.member.ign}</b></td>
                      <td className={ui.num}>{formatDiamonds(s.amount)}</td>
                      <td>{s.taxes.length ? s.taxes.map((t) => `${t.name} ${t.percent}%`).join(" · ") : "–"}</td>
                      <td className={ui.num}><b>{formatDiamonds(s.after_tax)}</b></td>
                      <td>{s.note ?? ""}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setModal({ type: "saving", saving: s })}>Edit</button>
                          <button className={`${ui.btnDanger} ${ui.btnSm}`} onClick={() => setModal({ type: "deleteSaving", saving: s })}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : visibleItems.length === 0 ? (
          <p className={ui.muted}>No items found.</p>
        ) : (
          <div className={ui.tableWrapper}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Purchased</th>
                  <th>Item</th>
                  <th className={ui.num}>Cost</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td>{formatShortDate(item.purchased_at)}</td>
                    <td><b>{item.name}</b></td>
                    <td className={ui.num}>{formatDiamonds(item.cost)}</td>
                    <td>
                      <span className={`${ui.badge} ${styles[`status_${item.status}`]}`}>{item.status_label}</span>
                      {item.assignee_inactive && <span className={styles.warn} title="This member left the clan or is inactive. Release the item to make it Free.">⚠ not in clan / inactive</span>}
                      {item.status === "sold" && item.sold_at && <div className={ui.muted} style={{ fontSize: 12 }}>on {formatShortDate(item.sold_at)}{item.sold_note ? ` · ${item.sold_note}` : ""}</div>}
                    </td>
                    <td>{item.note ?? ""}</td>
                    <td>
                      <div className={styles.rowActions}>
                        {item.status !== "sold" && (
                          <button className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setModal({ type: "assign", item })}>{item.status === "assigned" ? "Reassign" : "Assign"}</button>
                        )}
                        {item.status === "assigned" && (
                          <button className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setModal({ type: "release", item })}>Release</button>
                        )}
                        {item.status !== "sold" && (
                          <button className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setModal({ type: "sell", item })}>Sell</button>
                        )}
                        <button className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setModal({ type: "history", item })}>History</button>
                        <button className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setModal({ type: "item", item })}>Edit</button>
                        {item.status !== "sold" && (
                          <button className={`${ui.btnDanger} ${ui.btnSm}`} onClick={() => setModal({ type: "deleteItem", item })}>Remove</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className={ui.hint}>
        Balance = all saving records (after the ticked taxes) − the cost of items. Selling an item only changes its status; the diamonds are not returned to the balance. Removing an item undoes the purchase and returns its cost.
      </p>

      {modal?.type === "saving" && <SavingFormModal saving={modal.saving} clan={clan} members={clanMembers} taxes={taxes} onClose={() => setModal(null)} onSaved={saved} />}
      {modal?.type === "item" && <ItemFormModal item={modal.item} clan={clan} members={clanMembers} balance={summary.balance} onClose={() => setModal(null)} onSaved={saved} />}
      {modal?.type === "assign" && <AssignModal item={modal.item} members={clanMembers} onClose={() => setModal(null)} onSaved={saved} />}
      {(modal?.type === "release" || modal?.type === "sell") && <ItemActionModal item={modal.item} action={modal.type} onClose={() => setModal(null)} onSaved={saved} />}
      {modal?.type === "history" && <HistoryModal item={modal.item} onClose={() => setModal(null)} />}
      {modal?.type === "deleteSaving" && (
        <ConfirmModal title="Delete this saving?" message={`${formatDiamonds(modal.saving.after_tax)} saved by ${modal.saving.member.ign} is removed from the balance.`} confirmLabel="Delete" danger busy={busy} onConfirm={runDelete} onClose={() => setModal(null)} />
      )}
      {modal?.type === "deleteItem" && (
        <ConfirmModal title="Remove this item?" message={`"${modal.item.name}" is removed and its cost of ${formatDiamonds(modal.item.cost)} goes back to the balance. Use Sell instead if the item was sold.`} confirmLabel="Remove" danger busy={busy} onConfirm={runDelete} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
