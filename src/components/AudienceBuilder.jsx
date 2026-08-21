import { useState } from 'react'
import {
  newBlock, blocksOf, joinsOf, compactSegment, totalMembers, segmentEntities, segmentScopes, entityTypes, entityDef,
  operatorsFor, ruleActive, segmentActive, segmentSentence, segmentPlural, primaryBlock, entityRecordCount,
  parseAudiencePhrase, audienceReach,
  fmt, datasetMatchedMembers, SYMITAR_STATS,
  fieldsFor,
} from '../data'
import { CloseIcon, SparkleIcon, ProductIcon } from '../icons'

const sectionLabel = { fontSize: 11, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }
const helperText = { margin: '4px 0 0', fontSize: 12.5, fontWeight: 600, color: '#8a95a6', lineHeight: 1.45 }
const selectStyle = {
  width: '100%', boxSizing: 'border-box', border: '1px solid #d8e0ea', borderRadius: 9,
  padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#17335f',
  outline: 'none', background: '#fff',
}

/* Full-screen audience builder. A segment is a stack of BLOCKS joined
   with AND — the industry mental model (Klaviyo/Customer.io). Each block
   is the atom: scope + quantifier + same-record conditions. The first
   non-'none' block is PRIMARY: its matching records enroll and
   personalize; 'none' blocks are person-level filters. */
export default function AudienceBuilder({ audiences, audience, initialRule, onCancel, onSave }) {
  const isNew = !audience
  const [name, setName] = useState(audience?.name ?? '')

  // never open in a dead state: blocks default to the first scope; stale
  // entities coerce back to it; legacy single-rule objects wrap to one block
  const defaultBlock = () => {
    const first = segmentScopes()[0] ?? null
    return { ...newBlock(), entity: first?.entity ?? null, codeCategory: first?.codeCategory ?? null }
  }
  const normalizeBlock = (b) => {
    if (!b?.entity || !entityDef(b.entity)) return { ...defaultBlock(), quantifier: b?.quantifier ?? 'any' }
    return {
      quantifier: b.quantifier ?? 'any',
      entity: b.entity,
      codeCategory: b.codeCategory ?? null,
      types: [...(b.types ?? [])],
      conditions: (b.conditions ?? []).map((c) => ({ ...c })),
    }
  }
  const normalizeSegment = (x) => {
    const bs = blocksOf(x).map(normalizeBlock)
    const blocks = bs.length ? bs : [defaultBlock()]
    return { blocks, joins: joinsOf({ blocks, joins: x?.joins }) }
  }

  const [segment, setSegment] = useState(() => normalizeSegment(audience?.rule ?? initialRule))
  const [aiText, setAiText] = useState('')
  const [aiStatus, setAiStatus] = useState('idle')

  const entities = segmentEntities()
  const active = segmentActive(segment)
  const primary = primaryBlock(segment)
  // group bookkeeping for the OR visuals: maximal OR-runs share a border
  const joins = joinsOf(segment)
  const groupIdx = []
  {
    let g = 0
    segment.blocks.forEach((_, i) => {
      if (i > 0 && joins[i - 1] === 'AND') g++
      groupIdx.push(g)
    })
  }
  const groupSize = groupIdx.reduce((m, g) => ((m[g] = (m[g] ?? 0) + 1), m), {})
  const hasOr = joins.includes('OR')
  const reach = audienceReach({ rule: active ? segment : null, users: null })
  const canSave = active
  const suggestedName = active ? (segmentSentence(segment) || '').slice(0, 34) : 'My audience'

  const buildFromPhrase = () => {
    const parsed = parseAudiencePhrase(aiText)
    if (parsed) { setSegment(normalizeSegment(parsed)); setAiStatus('ok') } else setAiStatus('fail')
  }

  // every setter must spread ...s — joins live alongside blocks
  const patchBlock = (i, fn) =>
    setSegment((s) => ({ ...s, blocks: s.blocks.map((b, j) => (j === i ? fn(b) : b)) }))

  const setScope = (i, entity, codeCategory) =>
    patchBlock(i, (b) =>
      b.entity === entity && (b.codeCategory ?? null) === codeCategory
        ? b
        : { ...newBlock(), quantifier: b.quantifier, entity, codeCategory }
    )
  const setQuantifier = (i, q) => patchBlock(i, (b) => ({ ...b, quantifier: q }))
  const toggleType = (i, code) =>
    patchBlock(i, (b) => ({ ...b, types: b.types.includes(code) ? b.types.filter((x) => x !== code) : [...b.types, code] }))
  const clearTypes = (i) => patchBlock(i, (b) => ({ ...b, types: [] }))
  const addCondition = (i) =>
    patchBlock(i, (b) => {
      const f = fieldsFor(b)[0]
      if (!f) return b
      const id = (b.conditions[b.conditions.length - 1]?.id ?? 0) + 1
      return { ...b, conditions: [...b.conditions, { id, field: f.name, op: operatorsFor(f.type)[0].key, value: '', n: 3 }] }
    })
  const patchCondition = (i, id, patch) =>
    patchBlock(i, (b) => ({ ...b, conditions: b.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
  const removeCondition = (i, id) =>
    patchBlock(i, (b) => ({ ...b, conditions: b.conditions.filter((c) => c.id !== id) }))
  const addBlock = () => setSegment((s) => ({ blocks: [...s.blocks, defaultBlock()], joins: [...joinsOf(s), 'AND'] }))
  const removeBlock = (i) =>
    setSegment((s) => ({
      blocks: s.blocks.filter((_, j) => j !== i),
      joins: joinsOf(s).filter((_, j) => j !== Math.max(0, i - 1)),
    }))
  const toggleJoin = (i) =>
    setSegment((s) => ({ ...s, joins: joinsOf(s).map((j, k) => (k === i - 1 ? (j === 'OR' ? 'AND' : 'OR') : j)) }))

  const save = () =>
    onSave({
      id: audience?.id ?? `aud-custom-${Date.now()}`,
      name: name.trim() || suggestedName,
      kind: 'Rule',
      rule: active ? compactSegment(segment) : null,
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
        {/* left — the block stack */}
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
                  placeholder="Describe the audience — e.g. anyone with a loan due in the next 3 days and no card"
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

            {/* the block stack */}
            <div style={{ marginBottom: 18 }}>
              <span style={sectionLabel}>Members who…</span>
              <p style={helperText}>
                Stack conditions with AND — a member belongs only when every block matches. Scopes, types and
                fields come from your own data; nothing here is built in.
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
                  {segment.blocks.map((block, i) => (
                    <div
                      key={i}
                      style={groupSize[groupIdx[i]] > 1 ? { borderLeft: '3px solid #b79ae0', paddingLeft: 12 } : undefined}
                    >
                      {i > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
                          {/* one control, both options visible — the segmented
                              shape is what makes it read as clickable */}
                          <div style={{ display: 'flex', background: '#eef1f6', borderRadius: 8, padding: 2, gap: 2, flex: 'none' }}>
                            {['AND', 'OR'].map((j) => {
                              const on = joins[i - 1] === j
                              return (
                                <button
                                  key={j}
                                  onClick={() => { if (!on) toggleJoin(i) }}
                                  style={{
                                    border: 'none', borderRadius: 6, padding: '4px 12px', fontFamily: 'inherit',
                                    fontSize: 11, fontWeight: 800, letterSpacing: '.5px', cursor: 'pointer',
                                    ...(on
                                      ? { background: '#fff', color: j === 'OR' ? '#7a4fc0' : '#17335f', boxShadow: '0 1px 3px rgba(20,34,60,.15)' }
                                      : { background: 'transparent', color: '#8a95a6' }),
                                  }}
                                >
                                  {j}
                                </button>
                              )
                            })}
                          </div>
                          <div style={{ flex: 1, height: 1, background: joins[i - 1] === 'OR' ? '#e4d7f5' : '#e2e8f1' }} />
                        </div>
                      )}
                      <BlockCard
                        block={block}
                        isPrimary={block === primary}
                        inOrGroup={groupSize[groupIdx[i]] > 1}
                        showRemove={i > 0}
                        onScope={(e, c) => setScope(i, e, c)}
                        onQuantifier={(q) => setQuantifier(i, q)}
                        onToggleType={(code) => toggleType(i, code)}
                        onClearTypes={() => clearTypes(i)}
                        onAddCondition={() => addCondition(i)}
                        onPatchCondition={(id, p) => patchCondition(i, id, p)}
                        onRemoveCondition={(id) => removeCondition(i, id)}
                        onRemove={() => removeBlock(i)}
                      />
                    </div>
                  ))}

                  <button
                    onClick={addBlock}
                    style={{
                      marginTop: 12, padding: '9px 15px', border: '1.5px dashed #c3ccd9', borderRadius: 10,
                      background: 'transparent', color: '#4a6088', fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                    }}
                  >
                    + AND members who…
                  </button>

                  {active && (
                    <>
                      <div style={{ marginTop: 16, background: '#eef5fc', border: '1px solid #cfe1f6', borderRadius: 11, padding: '11px 14px', maxWidth: 520 }}>
                        <span style={{ ...sectionLabel, color: '#5a7db0' }}>Rule</span>
                        <div style={{ marginTop: 3, fontSize: 13.5, fontWeight: 700, color: '#1f4a86', lineHeight: 1.45 }}>
                          {segmentSentence(segment)}
                        </div>
                      </div>

                      <div style={{ marginTop: 10, background: '#fbf1dc', borderRadius: 11, padding: '10px 14px', fontSize: 12.5, fontWeight: 700, color: '#8a6d2e', lineHeight: 1.45, maxWidth: 520 }}>
                        {primary && hasOr
                          ? `Each matching ${primary.entity} record in the primary block enrolls separately. Members who qualify through an OR alternative without a matching ${primary.entity} record enroll once, member-level.`
                          : primary
                            ? `Each matching ${primary.entity} record in the primary block enrolls separately — the other blocks only decide who is eligible.`
                            : 'Every block is a filter — members matching all of them enroll once, with no per-record enrollment.'}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* right — live preview */}
        <div style={{ width: 420, flex: 'none', borderLeft: '1px solid #edf1f6', background: '#f7f9fc', overflowY: 'auto', padding: '22px 24px 40px' }}>
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
                members{reach.products !== null && ` · ${fmt(reach.products)} matching ${segmentPlural(segment)}`}
                {(reach.memberLevel ?? 0) > 0 && ` · ${fmt(reach.memberLevel)} via OR alternative`}
              </span>
            </div>
            <div style={{ marginTop: 12, height: 6, borderRadius: 6, background: 'rgba(255,255,255,.25)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.round((reach.members / Math.max(1, totalMembers())) * 100))}%`, height: '100%', background: '#fff', transition: 'width .2s' }} />
            </div>
          </div>

          {active && reach.unlabeled > 0 && (
            <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 700, color: '#8a6d2e', background: '#fbf1dc', borderRadius: 9, padding: '8px 11px' }}>
              {reach.unlabeled} record{reach.unlabeled === 1 ? ' carries' : 's carry'} unlabeled codes — still
              targetable by raw code, readable once labeled in Data → Catalog.
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <span style={sectionLabel}>Sample matching members</span>
            {active ? (
              <SampleMembers segment={segment} />
            ) : (
              <p style={helperText}>Pick a scope and add conditions to preview exactly who matches — and which of their records qualified.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* One block, read as a sentence: "Has [any ▾] · scope" — the way
   marketers' tools phrase quantifiers (has done at least once / never),
   not a mode-switch tab row. */
function BlockCard({ block, isPrimary, inOrGroup, showRemove, onScope, onQuantifier, onToggleType, onClearTypes, onAddCondition, onPatchCondition, onRemoveCondition, onRemove }) {
  const blockActive = ruleActive(block)
  const types = blockActive ? entityTypes(block.entity, block.codeCategory ?? null) : []
  const zeroData = blockActive && entityRecordCount(block.entity) === 0
  return (
    <div style={{ marginTop: 10, border: '1px solid #e2e8f1', borderRadius: 13, padding: '13px 15px', background: '#fff' }}>
      {(isPrimary || showRemove) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
          {isPrimary && (
            <span style={{ fontSize: 10, fontWeight: 800, color: '#1f6f4a', background: '#e2f4ea', padding: '3px 9px', borderRadius: 20 }}>
              Primary — drives enrollment & personalization
            </span>
          )}
          {showRemove && (
            <button onClick={onRemove} style={{ marginLeft: 'auto', width: 22, height: 22, border: 'none', borderRadius: 6, background: 'transparent', color: '#8a95a6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <CloseIcon size={12} />
            </button>
          )}
        </div>
      )}

      {/* sentence spine: quantifier as a verb, scope as the object */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: '#17335f' }}>Has</span>
        <select
          value={block.quantifier}
          onChange={(e) => onQuantifier(e.target.value)}
          style={{ ...selectStyle, width: 'auto', padding: '8px 8px', fontSize: 13 }}
        >
          <option value="any">any</option>
          <option value="none">no</option>
          <option value="two_plus">2 or more</option>
        </select>
        {segmentScopes().map((s) => {
          const on = block.entity === s.entity && (block.codeCategory ?? null) === s.codeCategory
          return (
            <button
              key={s.entity + '·' + s.codeCategory}
              onClick={() => onScope(s.entity, s.codeCategory)}
              style={{
                padding: '8px 15px', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                border: `1px solid ${on ? '#cfe1f6' : '#e2e8f1'}`,
                background: on ? '#eef5fc' : '#fff',
                color: on ? '#1f4a86' : '#17335f',
              }}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {/* honest zero-data state — generic, driven by the data itself */}
      {zeroData && (
        <div style={{ marginTop: 10, background: '#fbf1dc', borderRadius: 10, padding: '9px 12px', fontSize: 11.5, fontWeight: 700, color: '#8a6d2e', lineHeight: 1.5, maxWidth: 520 }}>
          No {block.entity} records in this dataset yet — “Has any” matches no one; “Has no” matches all {fmt(totalMembers())} members.
          {entityDef(block.entity)?.note && (
            <div style={{ marginTop: 3, fontWeight: 600 }}>{entityDef(block.entity).note}</div>
          )}
        </div>
      )}

      {blockActive && (
        <>
          {types.length > 0 && (
            <div style={{ marginTop: 9, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <TypeChip label="All types in scope" on={block.types.length === 0} onClick={onClearTypes} />
              {types.map((t) => (
                <TypeChip
                  key={t.code}
                  label={t.labeled ? t.label : `${t.code} — unlabeled`}
                  on={block.types.includes(t.code)}
                  onClick={() => onToggleType(t.code)}
                />
              ))}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {block.conditions.map((c) => (
                <ConditionRow
                  key={c.id}
                  block={block}
                  condition={c}
                  onPatch={(p) => onPatchCondition(c.id, p)}
                  onRemove={() => onRemoveCondition(c.id)}
                />
              ))}
              <button
                onClick={onAddCondition}
                style={{
                  alignSelf: 'flex-start', padding: '7px 12px', border: '1.5px dashed #c3ccd9', borderRadius: 10,
                  background: 'transparent', color: '#4a6088', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
                }}
              >
                + Add condition
              </button>
            </div>
            {block.conditions.length > 0 && (
              <p style={{ ...helperText, marginTop: 7 }}>
                {block.quantifier === 'none'
                  ? `Excludes members holding a ${block.entity} record matching ALL of these together — not any one alone.`
                  : `All conditions must match the same ${block.entity} record.`}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function SampleMembers({ segment }) {
  const members = datasetMatchedMembers(segment, 6)
  const primary = primaryBlock(segment)

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
          {primary && u.matches.map((p, i) => (
            <div key={i} style={{ margin: '5px 0 0 40px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#5a6b85' }}>
              <ProductIcon size={11} stroke="#5a7db0" />
              <span style={{ color: '#1b3a63', fontWeight: 800 }}>{p.label}</span>
              {p.fact}
            </div>
          ))}
          {primary && u.matches.length === 0 && (
            <div style={{ margin: '5px 0 0 40px', fontSize: 11, fontWeight: 700, color: '#8a95a6' }}>
              Qualifies via an OR alternative — enrolls once
            </div>
          )}
        </div>
      ))}
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

function ConditionRow({ block, condition, onPatch, onRemove }) {
  const fields = fieldsFor(block)
  const field = fields.find((f) => f.name === condition.field) ?? fields[0]
  const ops = operatorsFor(field.type)
  const op = ops.find((o) => o.key === condition.op) ?? ops[0]

  const changeField = (name) => {
    const f = fields.find((x) => x.name === name)
    onPatch({ field: name, op: operatorsFor(f.type)[0].key, value: '', n: 3 })
  }

  return (
    <div style={{ border: '1px solid #e2e8f1', borderRadius: 11, padding: 10, display: 'flex', gap: 8, background: '#fafbfd' }}>
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
        {/* what the model actually knows about this field: its type, and
            the mapped semantic role when one exists */}
        <span style={{ fontSize: 10, fontWeight: 700, color: '#8a95a6', background: '#eef1f6', padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
          {field.type}{field.role ? ` · ${field.role}` : ''}
        </span>
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
