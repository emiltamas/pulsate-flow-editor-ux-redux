import { useState } from 'react'
import {
  PRODUCT_CATEGORIES, CATEGORY_ORDER, QUANTIFIERS, EMPTY_PRODUCT_RULE,
  fieldByKey, operatorsFor, ruleActive, ruleSentence, parseAudiencePhrase,
} from '../data'
import { CloseIcon, SparkleIcon, RepeatIcon } from '../icons'

const sectionLabel = { fontSize: 11, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }
const helperText = { margin: '4px 0 0', fontSize: 12.5, fontWeight: 600, color: '#8a95a6', lineHeight: 1.45 }
const selectStyle = {
  width: '100%', boxSizing: 'border-box', border: '1px solid #d8e0ea', borderRadius: 9,
  padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#17335f',
  outline: 'none', background: '#fff',
}
const numInputStyle = { ...selectStyle, width: 74, textAlign: 'center' }

export default function ProductsPanel({ rule, onChange, freqCap, onFreqCapChange, savedAudiences, onSaveAudience }) {
  const active = ruleActive(rule)
  const cat = active ? PRODUCT_CATEGORIES[rule.category] : null

  const [aiText, setAiText] = useState('')
  const [aiStatus, setAiStatus] = useState('idle') // 'idle' | 'ok' | 'fail'
  const [saveName, setSaveName] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  const buildFromPhrase = () => {
    const parsed = parseAudiencePhrase(aiText)
    if (parsed) {
      onChange(parsed)
      setAiStatus('ok')
    } else {
      setAiStatus('fail')
    }
  }

  const suggestedName = active ? (ruleSentence(rule) || '').slice(0, 34) : ''
  const saveAudience = () => {
    onSaveAudience((saveName.trim() || suggestedName), { ...rule })
    setSaveName('')
    setJustSaved(true)
  }

  const hasDateCondition = active && rule.conditions.some((c) => fieldByKey(rule.category, c.field).type === 'date')

  const setCategory = (key) =>
    onChange(key === rule.category ? { ...EMPTY_PRODUCT_RULE, quantifier: rule.quantifier } : { ...EMPTY_PRODUCT_RULE, quantifier: rule.quantifier, category: key })

  const toggleType = (t) =>
    onChange({ ...rule, types: rule.types.includes(t) ? rule.types.filter((x) => x !== t) : [...rule.types, t] })

  const addCondition = () => {
    const f = cat.fields[0]
    const op = operatorsFor(f.type)[0]
    const id = (rule.conditions[rule.conditions.length - 1]?.id ?? 0) + 1
    onChange({ ...rule, conditions: [...rule.conditions, { id, field: f.key, op: op.key, value: '', n: 3 }] })
  }
  const patchCondition = (id, patch) =>
    onChange({ ...rule, conditions: rule.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  const removeCondition = (id) =>
    onChange({ ...rule, conditions: rule.conditions.filter((c) => c.id !== id) })

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 0 20px' }}>

      {/* AI assist */}
      <div style={{ padding: '0 24px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, border: '1.5px solid #cfe1f6', background: '#f7fafd', borderRadius: 12, padding: '9px 12px' }}>
          <SparkleIcon size={16} stroke="#2f6fc4" />
          <input
            value={aiText}
            onChange={(e) => { setAiText(e.target.value); setAiStatus('idle') }}
            onKeyDown={(e) => { if (e.key === 'Enter') buildFromPhrase() }}
            placeholder="Describe the audience — e.g. anyone with a loan due in the next 3 days"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#17335f' }}
          />
          <button
            onClick={buildFromPhrase}
            style={{ border: 'none', background: '#2f5aa0', color: '#fff', borderRadius: 8, padding: '6px 12px', fontFamily: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer', flex: 'none' }}
          >
            Build
          </button>
        </div>
        {aiStatus === 'ok' && <p style={{ ...helperText, color: '#1f6f4a' }}>Built from your description — review below.</p>}
        {aiStatus === 'fail' && <p style={helperText}>Couldn’t parse that — try mentioning a product type, e.g. “anyone with a loan due in the next 3 days”.</p>}
      </div>

      {/* saved audiences (quick apply) */}
      {!active && savedAudiences.length > 0 && (
        <div style={{ padding: '0 24px 18px' }}>
          <span style={sectionLabel}>Saved audiences</span>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {savedAudiences.map((s, i) => (
              <button
                key={i}
                onClick={() => onChange({ ...s.rule })}
                style={{
                  padding: '7px 12px', borderRadius: 9, border: '1px solid #cfe1f6', background: '#eef5fc',
                  color: '#1f4a86', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* quantifier */}
      <div style={{ padding: '0 24px 18px' }}>
        <span style={sectionLabel}>Member</span>
        <div style={{ marginTop: 8, display: 'flex', background: '#eef1f6', borderRadius: 10, padding: 3, gap: 3 }}>
          {QUANTIFIERS.map((q) => {
            const on = rule.quantifier === q.key
            return (
              <button
                key={q.key}
                onClick={() => onChange({ ...rule, quantifier: q.key })}
                style={{
                  flex: 1, border: 'none', borderRadius: 8, padding: '8px 4px', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  ...(on
                    ? { background: '#fff', color: '#17335f', boxShadow: '0 1px 3px rgba(20,34,60,.15)' }
                    : { background: 'transparent', color: '#5a6b85' }),
                }}
              >
                {q.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* product scope */}
      <div style={{ padding: '0 24px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={sectionLabel}>Product</span>
          {active && (
            <button
              onClick={() => onChange({ ...EMPTY_PRODUCT_RULE, quantifier: rule.quantifier })}
              style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800, color: '#2f6fc4', cursor: 'pointer', padding: 0 }}
            >
              Remove rule
            </button>
          )}
        </div>
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {CATEGORY_ORDER.map((key) => {
            const on = rule.category === key
            return (
              <button
                key={key}
                onClick={() => setCategory(key)}
                style={{
                  padding: '10px 8px', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  border: `1px solid ${on ? '#cfe1f6' : '#e2e8f1'}`,
                  background: on ? '#eef5fc' : '#fff',
                  color: on ? '#1f4a86' : '#17335f',
                }}
              >
                Any {PRODUCT_CATEGORIES[key].label.toLowerCase()}
              </button>
            )
          })}
        </div>
        {!active && <p style={helperText}>Pick a product type to start the rule. Members are matched on your own product labels — grouped so “any loan” works in one click.</p>}
        {active && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <TypeChip label={`All ${cat.label.toLowerCase()} types`} on={rule.types.length === 0} onClick={() => onChange({ ...rule, types: [] })} />
            {cat.types.map((t) => (
              <TypeChip key={t} label={t} on={rule.types.includes(t)} onClick={() => toggleType(t)} />
            ))}
          </div>
        )}
      </div>

      {active && (
        <>
          {/* conditions */}
          <div style={{ padding: '0 24px 18px' }}>
            <span style={sectionLabel}>Conditions</span>
            <p style={helperText}>All conditions must match the same product.</p>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rule.conditions.map((c) => (
                <ConditionRow
                  key={c.id}
                  category={rule.category}
                  condition={c}
                  onPatch={(p) => patchCondition(c.id, p)}
                  onRemove={() => removeCondition(c.id)}
                />
              ))}
              <button
                onClick={addCondition}
                style={{
                  alignSelf: 'flex-start', padding: '8px 13px', border: '1.5px dashed #c3ccd9', borderRadius: 10,
                  background: 'transparent', color: '#4a6088', fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                }}
              >
                + Add condition
              </button>
            </div>
          </div>

          {/* plain-language summary */}
          <div style={{ margin: '0 24px 18px', background: '#eef5fc', border: '1px solid #cfe1f6', borderRadius: 11, padding: '11px 14px' }}>
            <span style={{ ...sectionLabel, color: '#5a7db0' }}>Rule</span>
            <div style={{ marginTop: 3, fontSize: 13.5, fontWeight: 700, color: '#1f4a86', lineHeight: 1.45 }}>
              {ruleSentence(rule)}
            </div>
          </div>

          {/* save as reusable audience */}
          <div style={{ margin: '0 24px 18px' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={saveName}
                onChange={(e) => { setSaveName(e.target.value); setJustSaved(false) }}
                placeholder={suggestedName ? `Name this audience — e.g. “${suggestedName.slice(0, 24)}…”` : 'Name this audience'}
                style={{ ...selectStyle, flex: 1, fontWeight: 600 }}
              />
              <button
                onClick={saveAudience}
                style={{
                  border: '1px solid #cfe1f6', background: '#eef5fc', color: '#1f4a86', borderRadius: 9,
                  padding: '8px 13px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                Save as audience
              </button>
            </div>
            {justSaved && (
              <p style={{ ...helperText, color: '#1f6f4a' }}>Saved — reusable in any flow from the Products tab.</p>
            )}
          </div>

          {/* entry cadence (only for date-anchored rules) */}
          {hasDateCondition && (
            <div style={{ padding: '0 24px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={sectionLabel}>Entry</span>
              <EntryOption
                selected={!rule.recurring}
                onSelect={() => onChange({ ...rule, recurring: false })}
                title="One-time entry"
                desc="Members are evaluated once when the flow starts."
              />
              <EntryOption
                selected={!!rule.recurring}
                onSelect={() => onChange({ ...rule, recurring: true })}
                title="Recurring — re-enter each cycle"
                desc="Members re-enter each time the date approaches again — e.g. every month’s payment reminder."
                icon={<RepeatIcon size={13} />}
              />
            </div>
          )}

          {/* enrollment semantics */}
          <div style={{ margin: '0 24px 18px', background: '#fbf1dc', borderRadius: 11, padding: '10px 14px', fontSize: 12.5, fontWeight: 700, color: '#8a6d2e', lineHeight: 1.45 }}>
            Each matching product enrolls separately — a member with two qualifying loans gets each reminder.
          </div>

          {/* frequency cap (mock) */}
          <div style={{ padding: '0 24px' }}>
            <span style={sectionLabel}>Frequency cap</span>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 13, fontWeight: 700, color: '#1b3a63' }}>
              Send at most
              <Stepper value={freqCap.n} onChange={(n) => onFreqCapChange({ ...freqCap, n })} />
              product message{freqCap.n === 1 ? '' : 's'} per member per
              <select
                value={freqCap.per}
                onChange={(e) => onFreqCapChange({ ...freqCap, per: e.target.value })}
                style={{ ...selectStyle, width: 'auto' }}
              >
                <option value="day">day</option>
                <option value="week">week</option>
              </select>
            </div>
            <p style={helperText}>If two products qualify the same day, the closest due date sends first.</p>
          </div>
        </>
      )}
    </div>
  )
}

function EntryOption({ selected, onSelect, title, desc, icon }) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', gap: 11, padding: '11px 13px', borderRadius: 11, cursor: 'pointer',
        border: `1px solid ${selected ? '#cfe1f6' : '#e2e8f1'}`, background: selected ? '#eef5fc' : '#fff',
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: '50%', flex: 'none', marginTop: 1, boxSizing: 'border-box', border: `2px solid ${selected ? '#2f7fd6' : '#c3ccd9'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2f7fd6' }} />}
      </span>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 800, color: '#17335f' }}>
          {icon}
          {title}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#8a95a6', marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </div>
  )
}

function TypeChip({ label, on, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 11px', borderRadius: 8, fontFamily: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer',
        border: `1px solid ${on ? '#cfe1f6' : '#e2e8f1'}`,
        background: on ? '#e6effb' : '#fff',
        color: on ? '#2f6fc4' : '#5a6b85',
      }}
    >
      {label}
    </button>
  )
}

function ConditionRow({ category, condition, onPatch, onRemove }) {
  const field = fieldByKey(category, condition.field)
  const ops = operatorsFor(field.type)
  const op = ops.find((o) => o.key === condition.op) ?? ops[0]

  const changeField = (key) => {
    const f = fieldByKey(category, key)
    onPatch({ field: key, op: operatorsFor(f.type)[0].key, value: '', n: 3 })
  }

  return (
    <div style={{ border: '1px solid #e2e8f1', borderRadius: 11, padding: 10, display: 'flex', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <select value={condition.field} onChange={(e) => changeField(e.target.value)} style={selectStyle}>
          {PRODUCT_CATEGORIES[category].fields.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <select
            value={condition.op}
            onChange={(e) => onPatch({ op: e.target.value })}
            style={{ ...selectStyle, flex: 1 }}
          >
            {ops.map((o) => (
              <option key={o.key} value={o.key}>
                {o.hasN ? o.label.replace('N days', '… days') : o.label}
              </option>
            ))}
          </select>
          {field.type !== 'date' && (
            <input
              type="number"
              value={condition.value}
              placeholder="0"
              onChange={(e) => onPatch({ value: e.target.value })}
              style={numInputStyle}
            />
          )}
          {field.type === 'date' && op.hasN && (
            <>
              <input
                type="number"
                min={1}
                value={condition.n}
                onChange={(e) => onPatch({ n: e.target.value })}
                style={{ ...numInputStyle, width: 58 }}
              />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#5a6b85' }}>days</span>
            </>
          )}
        </div>
      </div>
      <button
        onClick={onRemove}
        style={{ width: 24, height: 24, flex: 'none', border: 'none', borderRadius: 7, background: 'transparent', color: '#8a95a6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
      >
        <CloseIcon size={12} />
      </button>
    </div>
  )
}

function Stepper({ value, onChange }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', border: '1px solid #d8e0ea', borderRadius: 8, overflow: 'hidden' }}>
      <button onClick={() => onChange(Math.max(1, value - 1))} style={stepBtn}>−</button>
      <span style={{ minWidth: 26, textAlign: 'center', fontSize: 13.5, fontWeight: 800, color: '#17335f' }}>{value}</span>
      <button onClick={() => onChange(Math.min(9, value + 1))} style={stepBtn}>+</button>
    </span>
  )
}

const stepBtn = { width: 26, height: 28, border: 'none', background: '#fff', color: '#2f6fc4', fontSize: 16, fontWeight: 800, cursor: 'pointer', lineHeight: 1, padding: 0 }
