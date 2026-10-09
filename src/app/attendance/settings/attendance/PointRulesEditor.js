"use client";

import { emptyRule, validateRules, MAX_RULES } from "@/lib/pointRules";
import ui from "../../components/attendance-ui.module.css";
import styles from "./attendance-settings.module.css";

// Editable list of time-window point rules. `rules` use string points (see toEditableRules).
export default function PointRulesEditor({ rules, onChange, idPrefix }) {
  const error = validateRules(rules);

  function update(index, patch) {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  return (
    <div>
      {rules.length === 0 ? (
        <p className={ui.muted}>No rules.</p>
      ) : (
        <div className={styles.ruleList}>
          <div className={`${styles.ruleRow} ${styles.ruleHead}`}>
            <span>Label</span><span>From</span><span>To (inclusive)</span><span>Points</span><span />
          </div>
          {rules.map((rule, i) => (
            <div key={i} className={styles.ruleRow}>
              <input className={`${ui.input} ${ui.inputSm}`} value={rule.label} maxLength={60} placeholder="e.g. Night" onChange={(e) => update(i, { label: e.target.value })} aria-label={`Rule ${i + 1} label`} id={`${idPrefix}-label-${i}`} />
              <input type="time" className={`${ui.input} ${ui.inputSm}`} value={rule.start_time} onChange={(e) => update(i, { start_time: e.target.value })} aria-label={`Rule ${i + 1} from`} />
              <input type="time" className={`${ui.input} ${ui.inputSm}`} value={rule.end_time} onChange={(e) => update(i, { end_time: e.target.value })} aria-label={`Rule ${i + 1} to`} />
              <input type="number" min="0" step="1" className={`${ui.input} ${ui.inputSm}`} value={rule.points} onChange={(e) => update(i, { points: e.target.value })} aria-label={`Rule ${i + 1} points`} />
              <button type="button" className={ui.btnDelete} onClick={() => onChange(rules.filter((_, idx) => idx !== i))} aria-label={`Remove rule ${i + 1}`}>Remove</button>
            </div>
          ))}
        </div>
      )}
      {error && <p className={ui.errorText}>{error}</p>}
      <button type="button" className={`${ui.btnGhost} ${ui.btnSm}`} style={{ marginTop: 10 }} disabled={rules.length >= MAX_RULES} onClick={() => onChange([...rules, emptyRule()])}>
        + Add rule
      </button>
    </div>
  );
}
