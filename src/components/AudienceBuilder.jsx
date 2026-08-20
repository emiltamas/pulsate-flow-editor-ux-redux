import { useState } from 'react'
import {
  QUANTIFIERS, EMPTY_RULE, totalMembers, segmentEntities, groupedSegmentEntities, entityTypes, entityDef,
  operatorsFor, ruleActive, ruleSentence, parseAudiencePhrase, audienceReach,
  tagColor, fmt, datasetMatchedMembers, SYMITAR_STATS,
  fieldsFor, rulePlural, codeLabel,
} from '../data'
import { CloseIcon, SparkleIcon, UsersIcon, ProductIcon } from '../icons'

const sectionLabel = { fontSize: 11, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }
const helperText = { margin: '4px 0 0', fontSize: 12.5, fontWeight: 600, color: '#8a95a6', lineHeight: 1.45 }
const selectStyle = {
  width: '100%', boxSizing: 'border-box', border: '1px solid #d8e0ea', borderRadius: 9,
  padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#17335f',
  outline: 'none', background: '#fff',
}

/* Full-screen audience builder: heavy building happens here, not in the
   journey drawer. Conditions are explicit and ANDed. */
export default function AudienceBuilder({ audiences, audience, initialRule, onCancel, onSave }) {
  const isNew = !audience
  const [name, setName] = useState(audience?.name ?? '')
  const [baseIds, setBaseIds] = useState(audience?.baseIds ?? [])
  // never open in a dead state: default to the first entity, and coerce
  // rules whose entity no longer exists (stale saves) back to it
  const normalizeRule = (r) => {
    const first = segmentEntities()[0]?.name ?? null
    if (!r) return { ...EMPTY_RULE, entity: first }
    if (!r.entity || !entityDef(r.entity)) return { ...EMPTY_RULE, quantifier: r.quantifier ?? 'any', entity: first }
    return { ...r }
  }
  const [rule, setRule] = useState(() => normalizeRule(audience?.rule ?? initialRule))
  const [aiText, setAiText] = useState('')
  const [aiStatus, setAiStatus] = useState('idle')

  // everything below renders from the LIVE registry — whatever entities
  // the FI's data declares, in the FI's own words
  const entities = segmentEntities()
  const active = ruleActive(rule)
  const preview = { rule: active ? rule : null, baseIds, users: null }
  const reach = audienceReach(preview, audiences)
  const canSave = active || baseIds.length > 0
  const suggestedName = active ? (ruleSentence(rule) || '').slice(0, 34) : 'My audience'

  const buildFromPhrase = () => {
    const parsed = parseAudiencePhrase(aiText)
    if (parsed) { setRule(parsed); setAiStatus('ok') } else setAiStatus('fail')
  }

  const setEntity = (name) => {
    if (name === rule.entity) return // no deselect back into a dead state
    setRule({ ...EMPTY_RULE, quantifier: rule.quantifier, entity: name })
  }
  const toggleType = (t) =>
    setRule({ ...rule, types: rule.types.includes(t) ? rule.types.filter((x) => x !== t) : [...rule.types, t] })
  const addCondition = () => {
    const f = fieldsFor(rule)[0]
    if (!f) return
    const id = (rule.conditions[rule.conditions.length - 1]?.id ?? 0) + 1
    setRule({ ...rule, conditions: [...rule.conditions, { id, field: f.name, op: operatorsFor(f.type)[0].key, value: '', n: 3 }] })
  }
  const patchCondition = (id, patch) =>
    setRule({ ...rule, conditions: rule.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  const removeCondition = (id) =>
    setRule({ ...rule, conditions: rule.conditions.filter((c) => c.id !== id) })
  const toggleBase = (id) =>
    setBaseIds(baseIds.includes(id) ? baseIds.filter((x) => x !== id) : [...baseIds, id])

  const save = () =>
    onSave({
      id: audience?.id ?? `aud-custom-${Date.now()}`,
      name: name.trim() || suggestedName,
      kind: 'Rule',
      rule: active ? rule : null,
      baseIds,
      users: reach.members,
      usedIn: audience?.usedIn ?? 0,
    })

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 40, display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ height: 62, borderBottom: '1px solid #edf1f6', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 14, flex: 'none' }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a95a6', padding: 2, display: 'flex' }}>
          <CloseIcon size={20} />
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#17335f', letterSpacing: '-.3px' }}>
          {isNew ? 'New audience' : 'Edit audience'}
        </h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#5a6b85', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => canSave && save()}
            style={{
              background: '#2f5aa0', border: 'none', borderRadius: 10, padding: '9px 22px', fontFamily: 'inherit',
              fontSize: 14, fontWeight: 800, color: '#fff', cursor: canSave ? 'pointer' : 'not-allowed',
              boxShadow: '0 2px 8px rgba(47,90,160,.3)', opacity: canSave ? 1 : 0.45, whiteSpace: 'nowrap',
            }}
          >
            Save audience
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* left — conditions */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '22px 36px 40px' }}>
          <div style={{ maxWidth: 640 }}>
            {/* name */}
            <div style={{ marginBottom: 18 }}>
              <span style={sectionLabel}>Audience name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={suggestedName}
                style={{ ...selectStyle, marginTop: 7, padding: '10px 12px', fontSize: 14, fontWeight: 600 }}
              />
            </div>

            {/* AI assist */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, border: '1.5px solid #cfe1f6', background: '#f7fafd', borderRadius: 12, padding: '10px 13px' }}>
                <SparkleIcon size={17} stroke="#2f6fc4" />
                <input
                  value={aiText}
                  onChange={(e) => { setAiText(e.target.value); setAiStatus('idle') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') buildFromPhrase() }}
                  placeholder="Describe the audience — e.g. anyone with a loan due in the next 3 days"
                  style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#17335f' }}
                />
                <button
                  onClick={buildFromPhrase}
                  style={{ border: 'none', background: '#2f5aa0', color: '#fff', borderRadius: 8, padding: '7px 14px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', flex: 'none' }}
                >
                  Build
                </button>
              </div>
              {aiStatus === 'ok' && <p style={{ ...helperText, color: '#1f6f4a' }}>Built from your description — review below.</p>}
              {aiStatus === 'fail' && <p style={helperText}>Couldn’t parse that — try mentioning one of your entities or labels, e.g. “anyone with a loan due in the next 3 days”.</p>}
            </div>

            {/* start from */}
            <div style={{ marginBottom: 22 }}>
              <span style={sectionLabel}>Start from</span>
              <p style={helperText}>Narrow an existing audience, or start from all members. Combined with the conditions below (AND).</p>
              <div style={{ marginTop: 9, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                <BaseChip label={`All members · ${fmt(totalMembers())}`} on={baseIds.length === 0} onClick={() => setBaseIds([])} />
                {audiences.filter((a) => a.kind !== 'Rule').map((a) => (
                  <BaseChip
                    key={a.id}
                    label={a.name}
                    dot={tagColor(a.kind)}
                    on={baseIds.includes(a.id)}
                    onClick={() => toggleBase(a.id)}
                  />
                ))}
              </div>
            </div>

            {/* entity conditions — driven entirely by the live registry */}
            <div style={{ marginBottom: 18 }}>
              <span style={sectionLabel}>Conditions</span>
              <p style={helperText}>
                Pick one of your data entities, then mix and match its types and fields. The names come from your own
                data — nothing here is built in.
              </p>

              {entities.length === 0 ? (
                <div style={{ marginTop: 10, border: '1px dashed #d8e0ea', borderRadius: 11, padding: '18px 16px', maxWidth: 520, textAlign: 'center', background: '#fafbfd' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1b3a63' }}>No data entities yet</div>
                  <div style={{ margin: '5px auto 0', fontSize: 12, fontWeight: 600, color: '#8a95a6', lineHeight: 1.5, maxWidth: 420 }}>
                    Connect a source in Data → Sources. Whatever it sends — products, offers, eligibility,
                    anything relational — appears here as a targetable entity.
                  </div>
                </div>
              ) : (
                <>
                  {/* which entity are we matching records of? Entities keep
                      the FI's own names; our curated categories only GROUP
                      them so a long registry stays scannable. */}
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
                    {groupedSegmentEntities().map((g) => (
                      <div key={g.category}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>
                          {g.label}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {g.entities.map((e) => {
                            const on = rule.entity === e.name
                            return (
                              <button
                                key={e.name}
                                onClick={() => setEntity(e.name)}
                                style={{
                                  minWidth: 130, padding: '10px 14px', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer', textAlign: 'left',
                                  border: `1px solid ${on ? '#cfe1f6' : '#e2e8f1'}`,
                                  background: on ? '#eef5fc' : '#fff',
                                  color: on ? '#1f4a86' : '#17335f',
                                }}
                              >
                                {e.name}
                                <div style={{ marginTop: 2, fontSize: 10, fontWeight: 700, color: on ? '#5a7db0' : '#8a95a6' }}>
                                  {e.fields.length} fields
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 10, display: 'flex', background: '#eef1f6', borderRadius: 10, padding: 3, gap: 3, maxWidth: 360 }}>
                    {QUANTIFIERS.map((qd) => {
                      const on = rule.quantifier === qd.key
                      return (
                        <button
                          key={qd.key}
                          onClick={() => setRule({ ...rule, quantifier: qd.key })}
                          style={{
                            flex: 1, border: 'none', borderRadius: 8, padding: '8px 4px', fontFamily: 'inherit',
                            fontSize: 13, fontWeight: 800, cursor: 'pointer',
                            ...(on
                              ? { background: '#fff', color: '#17335f', boxShadow: '0 1px 3px rgba(20,34,60,.15)' }
                              : { background: 'transparent', color: '#5a6b85' }),
                          }}
                        >
                          {qd.label}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {active && (
                <>
                  {entityTypes(rule.entity).length > 0 && (
                    <div style={{ marginTop: 9, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <TypeChip
                        label={`All ${rule.entity} types`}
                        on={rule.types.length === 0}
                        onClick={() => setRule({ ...rule, types: [] })}
                      />
                      {entityTypes(rule.entity).map((t) => (
                        <TypeChip
                          key={t.code}
                          label={t.labeled ? t.label : `${t.code} — unlabeled`}
                          on={rule.types.includes(t.code)}
                          onClick={() => toggleType(t.code)}
                        />
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 16 }}>
                    <span style={sectionLabel}>Conditions</span>
                    <p style={helperText}>All conditions must match the same {rule.entity} record.</p>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 520 }}>
                      {rule.conditions.map((c) => (
                        <ConditionRow
                          key={c.id}
                          rule={rule}
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

                  <div style={{ marginTop: 16, background: '#eef5fc', border: '1px solid #cfe1f6', borderRadius: 11, padding: '11px 14px', maxWidth: 520 }}>
                    <span style={{ ...sectionLabel, color: '#5a7db0' }}>Rule</span>
                    <div style={{ marginTop: 3, fontSize: 13.5, fontWeight: 700, color: '#1f4a86', lineHeight: 1.45 }}>
                      {ruleSentence(rule)}
                    </div>
                  </div>

                  <div style={{ marginTop: 10, background: '#fbf1dc', borderRadius: 11, padding: '10px 14px', fontSize: 12.5, fontWeight: 700, color: '#8a6d2e', lineHeight: 1.45, maxWidth: 520 }}>
                    Each matching record enrolls separately — a member with two qualifying {rule.entity} records gets each message.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* right — live preview */}
        <div style={{ width: 420, flex: 'none', borderLeft: '1px solid #edf1f6', background: '#f7f9fc', overflowY: 'auto', padding: '22px 24px 40px' }}>
          <>
              <div style={{ borderRadius: 13, background: 'linear-gradient(135deg,#1f4a86,#2f7fd6)', padding: '16px 18px', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ ...sectionLabel, color: 'rgba(255,255,255,.75)' }}>Exact reach</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,.2)', padding: '2px 8px', borderRadius: 20 }}>
                    {SYMITAR_STATS.fileDate} extract · {fmt(SYMITAR_STATS.accounts)} members
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 4 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: '-.5px' }}>{fmt(reach.members)}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.85 }}>
                    members{reach.products !== null && ` · ${fmt(reach.products)} matching ${rulePlural(rule)}`}
                  </span>
                </div>
                <div style={{ marginTop: 12, height: 6, borderRadius: 6, background: 'rgba(255,255,255,.25)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.round((reach.members / Math.max(1, totalMembers())) * 100))}%`, height: '100%', background: '#fff', transition: 'width .2s' }} />
                </div>
              </div>

              {active && reach.unlabeled > 0 && (
                <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 700, color: '#8a6d2e', background: '#fbf1dc', borderRadius: 9, padding: '8px 11px' }}>
                  {reach.unlabeled} {rule.entity} record{reach.unlabeled === 1 ? ' carries' : 's carry'} unlabeled codes — still
                  targetable by raw code, readable once labeled in Data → Catalog.
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <span style={sectionLabel}>Sample matching members</span>
                {active ? (
                  <SampleMembers rule={rule} />
                ) : (
                  <p style={helperText}>Pick an entity and add conditions to preview exactly who matches — and which of their records qualified.</p>
                )}
              </div>
          </>
        </div>
      </div>
    </div>
  )
}

function SampleMembers({ rule }) {
  const members = datasetMatchedMembers(rule, 6)

  if (!members.length) {
    return <p style={helperText}>No members in the extract match yet — try loosening a condition.</p>
  }
  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {members.map((u) => (
        <div key={u.id} style={{ background: '#fff', border: '1px solid #e7edf5', borderRadius: 11, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: u.avBg, color: u.avFg, fontSize: 11.5, fontWeight: 800 }}>
              {u.initials}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1b3a63', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
            {u.matches.length >= 2 && (
              <span style={{ fontSize: 10, fontWeight: 800, color: '#8a6d2e', background: '#fbf1dc', padding: '3px 7px', borderRadius: 20, flex: 'none' }}>
                {u.matches.length} enrollments
              </span>
            )}
          </div>
          {rule.quantifier !== 'none' && u.matches.map((p, i) => (
            <div key={i} style={{ margin: '5px 0 0 40px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#5a6b85' }}>
              <ProductIcon size={11} stroke="#5a7db0" />
              <span style={{ color: '#1b3a63', fontWeight: 800 }}>{p.label}</span>
              {p.fact}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function BaseChip({ label, dot, on, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 9,
        fontFamily: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer',
        border: `1px solid ${on ? '#cfe1f6' : '#e2e8f1'}`,
        background: on ? '#e6effb' : '#fff',
        color: on ? '#1f4a86' : '#5a6b85',
      }}
    >
      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flex: 'none' }} />}
      {label}
    </button>
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

function ConditionRow({ rule, condition, onPatch, onRemove }) {
  const fields = fieldsFor(rule)
  const field = fields.find((f) => f.name === condition.field) ?? fields[0]
  const ops = operatorsFor(field.type)
  const op = ops.find((o) => o.key === condition.op) ?? ops[0]

  const changeField = (name) => {
    const f = fields.find((x) => x.name === name)
    onPatch({ field: name, op: operatorsFor(f.type)[0].key, value: '', n: 3 })
  }

  return (
    <div style={{ border: '1px solid #e2e8f1', borderRadius: 11, padding: 10, display: 'flex', gap: 8, background: '#fff' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={condition.field} onChange={(e) => changeField(e.target.value)} style={{ ...selectStyle, width: 180 }}>
          {fields.map((f) => (
            <option key={f.name} value={f.name}>{f.label}</option>
          ))}
        </select>
        <select value={condition.op} onChange={(e) => onPatch({ op: e.target.value })} style={{ ...selectStyle, width: 'auto', flex: 1, minWidth: 150 }}>
          {ops.map((o) => (
            <option key={o.key} value={o.key}>{o.hasN ? o.label.replace('N days', '… days') : o.label}</option>
          ))}
        </select>
        {field.type !== 'date' && !op.noValue && (
          <input type="number" value={condition.value} placeholder="0" onChange={(e) => onPatch({ value: e.target.value })} style={{ ...selectStyle, width: 84, textAlign: 'center' }} />
        )}
        {field.type === 'date' && op.hasN && (
          <>
            <input type="number" min={1} value={condition.n} onChange={(e) => onPatch({ n: e.target.value })} style={{ ...selectStyle, width: 60, textAlign: 'center' }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#5a6b85' }}>days</span>
          </>
        )}
        {field.type === 'date' && op.hasDate && (
          <input type="date" value={condition.value} onChange={(e) => onPatch({ value: e.target.value })} style={{ ...selectStyle, width: 150 }} />
        )}
        {field.type === 'date' && op.hasDateRange && (
          <>
            <input type="date" value={condition.value} onChange={(e) => onPatch({ value: e.target.value })} style={{ ...selectStyle, width: 150 }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#5a6b85' }}>and</span>
            <input type="date" value={condition.value2 ?? ''} onChange={(e) => onPatch({ value2: e.target.value })} style={{ ...selectStyle, width: 150 }} />
          </>
        )}
      </div>
      <button
        onClick={onRemove}
        style={{ width: 24, height: 24, flex: 'none', border: 'none', borderRadius: 7, background: 'transparent', color: '#8a95a6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, alignSelf: 'center' }}
      >
        <CloseIcon size={12} />
      </button>
    </div>
  )
}
