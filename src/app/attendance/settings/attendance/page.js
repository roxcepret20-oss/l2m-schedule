"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/attendanceApi";
import { DAY_SHORT } from "@/lib/weeks";
import { GRADE_ORDER } from "@/lib/attendanceStandings";
import { describeRule, emptyRule, toEditableRules, toPayloadRules, validateRules } from "@/lib/pointRules";
import { ConfirmModal } from "../../components/Modal";
import ui from "../../components/attendance-ui.module.css";
import styles from "./attendance-settings.module.css";
import PointRulesEditor from "./PointRulesEditor";

const TABS = [
  { id: "bosses", label: "Bosses" },
  { id: "points", label: "Point schemas" },
  { id: "events", label: "Daily events" },
  { id: "grades", label: "Grade thresholds & scores" },
];

export default function AttendanceSettingsPage() {
  const [tab, setTab] = useState("bosses");

  return (
    <div className={ui.page}>
      <div className={ui.header}>
        <div>
          <h1 className={ui.title}>Attendance Settings</h1>
          <p className={ui.subtitle}>Boss list, daily events, grade thresholds and scores used by Attendances</p>
        </div>
      </div>

      <div className={ui.tabs} role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`${ui.tab} ${tab === t.id ? ui.tabActive : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bosses" && <BossesTab />}
      {tab === "points" && <PointRulesTab />}
      {tab === "events" && <EventsTab />}
      {tab === "grades" && <GradesTab />}
    </div>
  );
}

/* ───────────── Bosses ───────────── */

function BossesTab() {
  const [bosses, setBosses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [addName, setAddName] = useState("");
  const [addPoints, setAddPoints] = useState("10");
  const [addCustom, setAddCustom] = useState(false);
  const [addRules, setAddRules] = useState([]);
  const [adding, setAdding] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [editCustom, setEditCustom] = useState(false);
  const [editRules, setEditRules] = useState([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBosses(await apiFetch("/api/attendance-settings/bosses"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? bosses.filter((b) => b.name.toLowerCase().includes(q)) : bosses;
  }, [bosses, search]);

  async function handleAdd(e) {
    e.preventDefault();
    setAdding(true);
    setError("");
    try {
      await apiFetch("/api/attendance-settings/bosses", {
        method: "POST",
        body: { name: addName.trim(), default_points: Number(addPoints), point_rules: addCustom ? toPayloadRules(addRules) : null },
      });
      setAddName("");
      setAddCustom(false);
      setAddRules([]);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  function startEdit(boss) {
    setEditId(boss.id);
    setEditName(boss.name);
    setEditPoints(String(boss.default_points));
    setEditCustom(!!boss.point_rules?.length);
    setEditRules(toEditableRules(boss.point_rules));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/api/attendance-settings/bosses/${editId}`, {
        method: "PUT",
        body: { name: editName.trim(), default_points: Number(editPoints), point_rules: editCustom ? toPayloadRules(editRules) : null },
      });
      setEditId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/attendance-settings/bosses/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={ui.card}>
      <div className={ui.cardHeader}>
        <h2 className={ui.sectionTitle}>Boss list ({bosses.length})</h2>
        <input className={`${ui.input} ${ui.inputSm} ${styles.searchInput}`} placeholder="Search boss…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search boss" />
      </div>
      <p className={ui.muted} style={{ marginBottom: 16 }}>
        When a boss is added to an attendance (manually or by the Discord bot), its points come from the matching time window in the
        <b> Point schemas</b> tab. A boss can have its own schema instead; the default points are used when no window matches.
        Points can still be overridden per spawn. Changing rules never affects past attendances.
      </p>

      <form onSubmit={handleAdd} className={ui.inlineForm} style={{ marginBottom: 16 }}>
        <div className={ui.field} style={{ flex: 1, minWidth: 180 }}>
          <label className={ui.label} htmlFor="boss-add-name">Boss name</label>
          <input id="boss-add-name" className={ui.input} value={addName} onChange={(e) => setAddName(e.target.value)} maxLength={100} placeholder="Boss name" required />
        </div>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="boss-add-points">Default points</label>
          <input id="boss-add-points" type="number" min="0" className={`${ui.input} ${styles.pointsInput}`} value={addPoints} onChange={(e) => setAddPoints(e.target.value)} required />
        </div>
        <button type="submit" className={ui.btnPrimary} disabled={adding || !addName.trim() || addPoints === "" || (addCustom && !!validateRules(addRules))}>
          {adding ? "Adding…" : "Add boss"}
        </button>
        <div className={styles.customBox}>
          <label>
            <input type="checkbox" checked={addCustom} onChange={(e) => { setAddCustom(e.target.checked); if (e.target.checked && addRules.length === 0) setAddRules([emptyRule()]); }} /> Custom point schema for this boss
          </label>
          {addCustom && <div style={{ marginTop: 10 }}><PointRulesEditor rules={addRules} onChange={setAddRules} idPrefix="boss-add" /></div>}
        </div>
      </form>

      {error && <div className={ui.banner}>{error}</div>}

      {loading ? (
        <p className={ui.muted}>Loading…</p>
      ) : visible.length === 0 ? (
        <p className={ui.muted}>No bosses found.</p>
      ) : (
        <div className={ui.tableWrapper}>
          <table className={ui.table}>
            <thead>
              <tr><th>Name</th><th>Default points</th><th>Point schema</th><th>Updated by</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {visible.map((boss) =>
                editId === boss.id ? (
                  <tr key={boss.id}>
                    <td colSpan={5}>
                      <form onSubmit={handleSave} className={ui.inlineForm}>
                        <input className={`${ui.input} ${ui.inputSm}`} style={{ flex: 1, minWidth: 160 }} value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} required autoFocus aria-label="Boss name" />
                        <input type="number" min="0" className={`${ui.input} ${ui.inputSm} ${styles.pointsInput}`} value={editPoints} onChange={(e) => setEditPoints(e.target.value)} required aria-label="Default points" />
                        <button type="submit" className={`${ui.btnPrimary} ${ui.btnSm}`} disabled={saving || !editName.trim() || editPoints === "" || (editCustom && !!validateRules(editRules))}>{saving ? "Saving…" : "Save"}</button>
                        <button type="button" className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setEditId(null)} disabled={saving}>Cancel</button>
                        <div className={styles.customBox}>
                          <label>
                            <input type="checkbox" checked={editCustom} onChange={(e) => { setEditCustom(e.target.checked); if (e.target.checked && editRules.length === 0) setEditRules([emptyRule()]); }} /> Custom point schema for this boss
                          </label>
                          {editCustom && <div style={{ marginTop: 10 }}><PointRulesEditor rules={editRules} onChange={setEditRules} idPrefix="boss-edit" /></div>}
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={boss.id}>
                    <td>{boss.name}</td>
                    <td>{boss.default_points}</td>
                    <td className={ui.mutedCell}>
                      {boss.point_rules?.length ? boss.point_rules.map((r) => <span key={`${r.start_time}-${r.end_time}`} className={styles.ruleSummary}>{describeRule(r)}</span>) : "Global"}
                    </td>
                    <td className={ui.mutedCell}>{boss.updated_by_name || "—"}</td>
                    <td>
                      <div className={ui.actions}>
                        <button className={ui.btnEdit} onClick={() => startEdit(boss)}>Edit</button>
                        <button className={ui.btnDelete} onClick={() => setDeleteTarget(boss)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete boss?"
          message={`"${deleteTarget.name}" will be removed from the list. Attendances that already used it keep their entries.`}
          confirmLabel="Delete"
          danger
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ───────────── Point schemas ───────────── */

function PointRulesTab() {
  const [rules, setRules] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch("/api/attendance-settings/point-rules")
      .then((data) => setRules(toEditableRules(data)))
      .catch((err) => setError(err.message));
  }, []);

  const validationError = rules ? validateRules(rules) : "";

  function change(next) {
    setSaved(false);
    setRules(next);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const data = await apiFetch("/api/attendance-settings/point-rules", {
        method: "PUT",
        body: { rules: toPayloadRules(rules) },
      });
      setRules(toEditableRules(data));
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={ui.card}>
      <h2 className={ui.sectionTitle} style={{ marginBottom: 6 }}>Point schemas</h2>
      <p className={ui.muted} style={{ marginBottom: 16 }}>
        Points a boss earns depend on the time it spawned (Asia/Jakarta time). Each window includes both its start and end minute;
        a window whose start is later than its end wraps past midnight (e.g. 22:00 → 05:59). Windows cannot overlap. If no window matches,
        the boss&apos;s default points are used. These rules apply to bosses added from the Add bosses dialog and by the Discord bot;
        a boss with its own schema (Bosses tab) ignores them. Past attendances are never changed.
      </p>

      {!rules ? (
        error ? <div className={ui.banner}>{error}</div> : <p className={ui.muted}>Loading…</p>
      ) : (
        <form onSubmit={handleSave}>
          <PointRulesEditor rules={rules} onChange={change} idPrefix="global" />
          {error && <p className={ui.errorText}>{error}</p>}
          <div className={ui.actions} style={{ marginTop: 16 }}>
            <button type="submit" className={ui.btnPrimary} disabled={saving || !!validationError}>
              {saving ? "Saving…" : "Save"}
            </button>
            {saved && <span className={ui.muted}>Saved.</span>}
          </div>
        </form>
      )}
    </div>
  );
}

/* ───────────── Daily events ───────────── */

const EMPTY_TEMPLATE = { name: "", days: [0, 1, 2, 3, 4], event_time: "22:30", points: "100" };

function EventsTab() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_TEMPLATE);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTemplates(await apiFetch("/api/attendance-settings/event-templates"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleDay(day) {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day].sort(),
    }));
  }

  function startEdit(template) {
    setEditId(template.id);
    setForm({ name: template.name, days: template.days, event_time: template.event_time, points: String(template.points) });
    setFormError("");
  }

  function resetForm() {
    setEditId(null);
    setForm(EMPTY_TEMPLATE);
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await apiFetch(editId ? `/api/attendance-settings/event-templates/${editId}` : "/api/attendance-settings/event-templates", {
        method: editId ? "PUT" : "POST",
        body: { name: form.name.trim(), days: form.days, event_time: form.event_time, points: Number(form.points) },
      });
      resetForm();
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/attendance-settings/event-templates/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      if (editId === deleteTarget.id) resetForm();
      await load();
    } catch (err) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const canSubmit = form.name.trim() && form.days.length > 0 && form.event_time && form.points !== "";

  return (
    <div className={ui.card}>
      <h2 className={ui.sectionTitle} style={{ marginBottom: 6 }}>Daily event templates</h2>
      <p className={ui.muted} style={{ marginBottom: 16 }}>Added automatically to the matching days when a new attendance is created. Existing attendances are not changed.</p>

      {error && <div className={ui.banner}>{error}</div>}

      {loading ? (
        <p className={ui.muted}>Loading…</p>
      ) : templates.length === 0 ? (
        <p className={ui.muted}>No daily events yet.</p>
      ) : (
        <div className={ui.tableWrapper}>
          <table className={ui.table}>
            <thead>
              <tr><th>Name</th><th>Days</th><th>Time</th><th>Points</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.days.map((d) => DAY_SHORT[d]).join(", ")}</td>
                  <td>{t.event_time}</td>
                  <td>{t.points}</td>
                  <td>
                    <div className={ui.actions}>
                      <button className={ui.btnEdit} onClick={() => startEdit(t)}>Edit</button>
                      <button className={ui.btnDelete} onClick={() => setDeleteTarget(t)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.templateForm}>
        <h3 className={ui.sectionTitle} style={{ marginBottom: 12 }}>{editId ? "Edit event" : "Add event"}</h3>
        <div className={styles.templateGrid}>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="ev-name">Event name</label>
            <input id="ev-name" className={ui.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} placeholder="e.g. Veora" required />
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="ev-time">Time</label>
            <input id="ev-time" type="time" className={ui.input} value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} required />
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="ev-points">Points</label>
            <input id="ev-points" type="number" min="0" className={ui.input} value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} required />
          </div>
        </div>
        <div className={ui.field}>
          <span className={ui.label}>Days</span>
          <div className={styles.dayChecks}>
            {DAY_SHORT.map((label, day) => (
              <label key={day} className={`${styles.dayCheck} ${form.days.includes(day) ? styles.dayCheckOn : ""}`}>
                <input type="checkbox" checked={form.days.includes(day)} onChange={() => toggleDay(day)} />
                {label}
              </label>
            ))}
          </div>
        </div>
        {formError && <p className={ui.errorText}>{formError}</p>}
        <div className={ui.actions} style={{ marginTop: 12 }}>
          <button type="submit" className={ui.btnPrimary} disabled={saving || !canSubmit}>
            {saving ? "Saving…" : editId ? "Save event" : "Add event"}
          </button>
          {editId && (
            <button type="button" className={ui.btnGhost} onClick={resetForm} disabled={saving}>Cancel</button>
          )}
        </div>
      </form>

      {deleteTarget && (
        <ConfirmModal
          title="Delete event?"
          message={`"${deleteTarget.name}" will no longer be added to new attendances. Existing attendances keep it.`}
          confirmLabel="Delete"
          danger
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ───────────── Grade thresholds & scores ───────────── */

const SCORE_GRADES = [...GRADE_ORDER, "E"];

function toForm(data) {
  return {
    thresholds: Object.fromEntries(GRADE_ORDER.map((g) => [g, String(data.thresholds[g])])),
    scores: Object.fromEntries(SCORE_GRADES.map((g) => [g, String(data.scores[g])])),
  };
}

function GradesTab() {
  const [values, setValues] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch("/api/attendance-settings/grades")
      .then((data) => setValues(toForm(data)))
      .catch((err) => setError(err.message));
  }, []);

  function validate(v) {
    for (const g of GRADE_ORDER) {
      const n = Number(v.thresholds[g]);
      if (v.thresholds[g] === "" || !Number.isFinite(n) || n < 0 || n > 100) return `${g} must be a number between 0 and 100`;
    }
    for (let i = 1; i < GRADE_ORDER.length; i += 1) {
      if (Number(v.thresholds[GRADE_ORDER[i - 1]]) <= Number(v.thresholds[GRADE_ORDER[i]])) {
        return `${GRADE_ORDER[i - 1]} must be higher than ${GRADE_ORDER[i]}`;
      }
    }
    for (const g of SCORE_GRADES) {
      const n = Number(v.scores[g]);
      if (v.scores[g] === "" || !Number.isInteger(n) || n < 0) return `${g} score must be a whole number of 0 or more`;
    }
    return "";
  }

  const validationError = values ? validate(values) : "";

  function setField(group, grade, value) {
    setSaved(false);
    setValues((prev) => ({ ...prev, [group]: { ...prev[group], [grade]: value } }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const data = await apiFetch("/api/attendance-settings/grades", {
        method: "PUT",
        body: {
          thresholds: Object.fromEntries(GRADE_ORDER.map((g) => [g, Number(values.thresholds[g])])),
          scores: Object.fromEntries(SCORE_GRADES.map((g) => [g, Number(values.scores[g])])),
        },
      });
      setValues(toForm(data));
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={ui.card}>
      <h2 className={ui.sectionTitle} style={{ marginBottom: 6 }}>Grade thresholds &amp; scores</h2>
      <p className={ui.muted} style={{ marginBottom: 16 }}>
        A member&apos;s grade is based on their points as a percentage of the highest member&apos;s points in that attendance. Anything below D is E.
        The score value of the grade is added to the member&apos;s gear score to get the Total Score in the attendance summary.
        A settled (done) attendance keeps the thresholds and scores it was settled with.
      </p>

      {!values ? (
        error ? <div className={ui.banner}>{error}</div> : <p className={ui.muted}>Loading…</p>
      ) : (
        <form onSubmit={handleSave}>
          <table className={`${ui.table} ${styles.gradeTable}`}>
            <thead>
              <tr><th>Grade</th><th>Minimum % of highest points</th><th>Score value</th></tr>
            </thead>
            <tbody>
              {SCORE_GRADES.map((g) => (
                <tr key={g}>
                  <td><span className={`${ui.grade} ${ui[`grade_${g}`]}`}>{g}</span></td>
                  <td>
                    {g === "E" ? (
                      <span className={ui.mutedCell}>Below D</span>
                    ) : (
                      <>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          className={`${ui.input} ${ui.inputSm} ${styles.gradeInput}`}
                          value={values.thresholds[g]}
                          onChange={(e) => setField("thresholds", g, e.target.value)}
                          aria-label={`Minimum percent for ${g}`}
                        />{" "}
                        %
                      </>
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={`${ui.input} ${ui.inputSm} ${styles.gradeInput}`}
                      value={values.scores[g]}
                      onChange={(e) => setField("scores", g, e.target.value)}
                      aria-label={`Score value for ${g}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(validationError || error) && <p className={ui.errorText}>{validationError || error}</p>}
          <div className={ui.actions} style={{ marginTop: 16 }}>
            <button type="submit" className={ui.btnPrimary} disabled={saving || !!validationError}>
              {saving ? "Saving…" : "Save"}
            </button>
            {saved && <span className={ui.muted}>Saved.</span>}
          </div>
        </form>
      )}
    </div>
  );
}
