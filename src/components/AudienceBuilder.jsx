import { useState } from 'react'
import {
  newBlock, blocksOf, joinsOf, compactSegment, totalMembers, segmentEntities, segmentScopes, scopePickerItems, PULSATE_CATEGORY_ORDER, entityTypes, entityDef,
  distinctValues, referencableSegments, segmentById,
  operatorsFor, ruleActive, segmentActive, segmentSentence, segmentPlural, primaryBlock, entityRecordCount,
  conditionIncomplete, segmentIncompleteCount,
  parseAudiencePhrase, audienceReach,
  fmt, datasetMatchedMembers, dataSourceCount,
  fieldsFor,
} from '../data'
import { CloseIcon, SparkleIcon, ProductIcon } from '../icons'

const sectionLabel = { fontSize: 12, fontWeight: 600, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }
const helperText = { margin: '4px 0 0', fontSize: 13.5, fontWeight: 600, color: '#8a95a6', lineHeight: 1.45 }
const selectStyle = {
  width: '100%', boxSizing: 'border-box', border: '1px solid #d8e0ea', borderRadius: 4,
  padding: '8px 10px', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: '#2e3d66',
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
    if (b?.segmentRef) {
      return { ...newBlock(), entity: null, segmentRef: b.segmentRef, quantifier: b.quantifier === 'none' ? 'none' : 'any' }
    }
    if (!b?.entity || !entityDef(b.entity)) return { ...defaultBlock(), quantifier: b?.quantifier ?? 'any' }
    return {
      quantifier: b.quantifier ?? 'any',
      entity: b.entity,
      codeCategory: b.codeCategory ?? null,
      types: [...(b.types ?? [])],
      conditions: (b.conditions ?? []).map((c) => ({ ...c })),
      aggregates: (b.aggregates ?? []).map((a) => ({ ...a })),
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
  const reach = audienceReach({ rule: active ? segment : null, users: null })
  const canSave = active
  const suggestedName = active ? (segmentSentence(segment) || '').slice(0, 34) : 'My segment'

  const buildFromPhrase = () => {
    const parsed = parseAudiencePhrase(aiText)
    if (parsed) { setSegment(normalizeSegment(parsed)); setAiStatus('ok') } else setAiStatus('fail')
  }

  // every setter must spread ...s — joins live alongside blocks
  const patchBlock = (i, fn) =>
    setSegment((s) => ({ ...s, blocks: s.blocks.map((b, j) => (j === i ? fn(b) : b)) }))

  const setScope = (i, entity, codeCategory) =>
    patchBlock(i, (b) =>
      !b.segmentRef && b.entity === entity && (b.codeCategory ?? null) === codeCategory
        ? b
        : { ...newBlock(), quantifier: b.quantifier, entity, codeCategory }
    )
  const setScopeRef = (i, id) =>
    patchBlock(i, (b) => ({ ...newBlock(), entity: null, segmentRef: id, quantifier: b.quantifier === 'none' ? 'none' : 'any' }))
  const addAggregate = (i) =>
    patchBlock(i, (b) => {
      const f = fieldsFor(b).find((x) => x.type === 'currency' || x.type === 'number')
      const id = ((b.aggregates ?? [])[b.aggregates?.length - 1]?.id ?? 0) + 1
      return { ...b, aggregates: [...(b.aggregates ?? []), { id, fn: f ? 'sum' : 'count', field: f?.name ?? null, op: 'gt', value: '' }] }
    })
  const patchAggregate = (i, id, patch) =>
    patchBlock(i, (b) => ({ ...b, aggregates: (b.aggregates ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)) }))
  const removeAggregate = (i, id) =>
    patchBlock(i, (b) => ({ ...b, aggregates: (b.aggregates ?? []).filter((a) => a.id !== id) }))
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
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: '#2e3d66', letterSpacing: '-.3px' }}>
          {isNew ? 'New segment' : 'Edit segment'}
        </h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 15, fontWeight: 500, color: '#5a6b85', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => canSave && save()}
            style={{
              background: '#2d4b8a', border: 'none', borderRadius: 4, padding: '9px 22px', fontFamily: 'inherit',
              fontSize: 15, fontWeight: 600, color: '#fff', cursor: canSave ? 'pointer' : 'not-allowed',
              boxShadow: '0 2px 8px rgba(47,90,160,.3)', opacity: canSave ? 1 : 0.45, whiteSpace: 'nowrap',
            }}
          >
            Save segment
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* left — the block stack */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '22px 36px 40px' }}>
          <div style={{ maxWidth: 640 }}>
            {/* name */}
            <div style={{ marginBottom: 18 }}>
              <span style={sectionLabel}>Segment name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={suggestedName}
                style={{ ...selectStyle, marginTop: 7, padding: '10px 12px', fontSize: 15, fontWeight: 600 }}
              />
            </div>

            {/* AI assist */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, border: '1.5px solid #cfe1f6', background: '#f7fafd', borderRadius: 4, padding: '10px 13px' }}>
                <SparkleIcon size={17} stroke="#2f6fc4" />
                <input
                  value={aiText}
                  onChange={(e) => { setAiText(e.target.value); setAiStatus('idle') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') buildFromPhrase() }}
                  placeholder="Describe the segment — e.g. anyone with a loan due in the next 3 days and no card"
                  style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, color: '#2e3d66' }}
                />
                <button
                  onClick={buildFromPhrase}
                  style={{ border: 'none', background: '#2d4b8a', color: '#fff', borderRadius: 4, padding: '7px 14px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', flex: 'none' }}
                >
                  Build
                </button>
              </div>
              {aiStatus === 'ok' && <p style={{ ...helperText, color: '#1f6f4a' }}>Built from your description — review below.</p>}
              {aiStatus === 'fail' && <p style={helperText}>Couldn’t parse that — try mentioning one of your entities or labels, e.g. “anyone with a loan due in the next 3 days”.</p>}
            </div>

            {/* the block stack — the sentence-shaped blocks and the
                AND/OR toggles explain themselves; no tutorial paragraph */}
            <div style={{ marginBottom: 18 }}>
              <span style={sectionLabel}>Members who…</span>

              {entities.length === 0 ? (
                <div style={{ marginTop: 10, border: '1px dashed #d8e0ea', borderRadius: 4, padding: '18px 16px', maxWidth: 520, textAlign: 'center', background: '#fafbfd' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1b3a63' }}>No data entities yet</div>
                  <div style={{ margin: '5px auto 0', fontSize: 13, fontWeight: 600, color: '#8a95a6', lineHeight: 1.5, maxWidth: 420 }}>
                    Connect a source in Data → Sources. Whatever it sends — products, offers, eligibility,
                    anything relational — appears here as a targetable entity.
                  </div>
                </div>
              ) : (
                <>
                  {segment.blocks.map((block, i) => (
                    <div
                      key={i}
                      style={groupSize[groupIdx[i]] > 1 ? { borderLeft: '3px solid #c9418f', paddingLeft: 12 } : undefined}
                    >
                      {i > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
                          {/* one control, both options visible — the segmented
                              shape is what makes it read as clickable */}
                          <div style={{ display: 'flex', background: '#e9ecf7', borderRadius: 4, padding: 2, gap: 2, flex: 'none' }}>
                            {['AND', 'OR'].map((j) => {
                              const on = joins[i - 1] === j
                              return (
                                <button
                                  key={j}
                                  onClick={() => { if (!on) toggleJoin(i) }}
                                  style={{
                                    border: 'none', borderRadius: 4, padding: '4px 12px', fontFamily: 'inherit',
                                    fontSize: 12, fontWeight: 600, letterSpacing: '.5px', cursor: 'pointer',
                                    ...(on
                                      ? { background: '#fff', color: j === 'OR' ? '#c9418f' : '#2e3d66', boxShadow: '0 1px 3px rgba(20,34,60,.15)' }
                                      : { background: 'transparent', color: '#8a95a6' }),
                                  }}
                                >
                                  {j}
                                </button>
                              )
                            })}
                          </div>
                          <div style={{ flex: 1, height: 1, background: joins[i - 1] === 'OR' ? '#f3d3e6' : '#e2e8f1' }} />
                        </div>
                      )}
                      <BlockCard
                        block={block}
                        showRemove={i > 0}
                        excludeSegmentId={audience?.id}
                        onScope={(e, c) => setScope(i, e, c)}
                        onScopeRef={(id) => setScopeRef(i, id)}
                        onQuantifier={(q) => setQuantifier(i, q)}
                        onToggleType={(code) => toggleType(i, code)}
                        onClearTypes={() => clearTypes(i)}
                        onAddCondition={() => addCondition(i)}
                        onPatchCondition={(id, p) => patchCondition(i, id, p)}
                        onRemoveCondition={(id) => removeCondition(i, id)}
                        onAddAggregate={() => addAggregate(i)}
                        onPatchAggregate={(id, p) => patchAggregate(i, id, p)}
                        onRemoveAggregate={(id) => removeAggregate(i, id)}
                        onRemove={() => removeBlock(i)}
                      />
                    </div>
                  ))}

                  <button
                    onClick={addBlock}
                    style={{
                      marginTop: 12, padding: '9px 15px', border: '1.5px dashed #c3ccd9', borderRadius: 4,
                      background: 'transparent', color: '#4a6088', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    + AND members who…
                  </button>

                  {/* the audience speaks audience language only — what
                      happens per record when a flow USES this audience
                      is stated in the flow's entry step, not here */}
                  {active && (
                    <div style={{ marginTop: 16, background: '#eef5fc', border: '1px solid #cfe1f6', borderRadius: 4, padding: '11px 14px', maxWidth: 520 }}>
                      <span style={{ ...sectionLabel, color: '#5a7db0' }}>Rule</span>
                      <div style={{ marginTop: 3, fontSize: 14.5, fontWeight: 500, color: '#1f4a86', lineHeight: 1.45 }}>
                        {segmentSentence(segment)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* right — live preview */}
        <div style={{ width: 420, flex: 'none', borderLeft: '1px solid #edf1f6', background: '#f7f9fc', overflowY: 'auto', padding: '22px 24px 40px' }}>
          <div style={{ borderRadius: 4, background: 'linear-gradient(135deg,#1f4a86,#2f7fd6)', padding: '16px 18px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ ...sectionLabel, color: 'rgba(255,255,255,.75)' }}>Exact reach</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.2)', padding: '2px 8px', borderRadius: 4 }}>
                {fmt(totalMembers())} members · {dataSourceCount()} source{dataSourceCount() === 1 ? '' : 's'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 600, lineHeight: 1, letterSpacing: '-.5px' }}>{fmt(reach.members)}</span>
              <span style={{ fontSize: 13.5, fontWeight: 500, opacity: 0.85 }}>
                members{reach.products !== null && ` · ${fmt(reach.products)} matching ${segmentPlural(segment)}`}
                {(reach.memberLevel ?? 0) > 0 && ` · ${fmt(reach.memberLevel)} via OR path`}
              </span>
            </div>
            <div style={{ marginTop: 12, height: 6, borderRadius: 4, background: 'rgba(255,255,255,.25)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.round((reach.members / Math.max(1, totalMembers())) * 100))}%`, height: '100%', background: '#fff', transition: 'width .2s' }} />
            </div>
          </div>

          {active && segmentIncompleteCount(segment) > 0 && (
            <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 500, color: '#8a6d2e', background: '#fbf1dc', borderRadius: 4, padding: '8px 11px' }}>
              {segmentIncompleteCount(segment)} condition{segmentIncompleteCount(segment) === 1 ? ' needs' : 's need'} a date —
              until filled in, {segmentIncompleteCount(segment) === 1 ? 'it matches' : 'they match'} no records, which can pull reach to 0.
            </div>
          )}

          {active && reach.unlabeled > 0 && (
            <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 500, color: '#8a6d2e', background: '#fbf1dc', borderRadius: 4, padding: '8px 11px' }}>
              {reach.unlabeled} record{reach.unlabeled === 1 ? ' carries' : 's carry'} unlabeled codes — still
              targetable by raw code, readable once labeled in Data → Dictionary.
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

/* One block, continuing the "Members who…" header as a sentence:
   "have [any ▾] · scope" — the way marketers' tools phrase quantifiers
   (has done at least once / never), not a mode-switch tab row. */
function BlockCard({ block, showRemove, excludeSegmentId, onScope, onScopeRef, onQuantifier, onToggleType, onClearTypes, onAddCondition, onPatchCondition, onRemoveCondition, onAddAggregate, onPatchAggregate, onRemoveAggregate, onRemove }) {
  const isRef = !!block.segmentRef
  const blockActive = ruleActive(block)
  const types = blockActive && !isRef ? entityTypes(block.entity, block.codeCategory ?? null) : []
  const zeroData = blockActive && !isRef && entityRecordCount(block.entity) === 0
  const numericFields = isRef ? [] : fieldsFor(block).filter((f) => f.type === 'currency' || f.type === 'number')
  return (
    <div style={{ marginTop: 10, border: '1px solid #e2e8f1', borderRadius: 4, padding: '13px 15px', background: '#fff', position: 'relative' }}>
      {showRemove && (
        <button onClick={onRemove} style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, border: 'none', borderRadius: 4, background: 'transparent', color: '#8a95a6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
          <CloseIcon size={12} />
        </button>
      )}

      {/* sentence spine: quantifier as a verb, scope as the object —
          the scope is a searchable grouped picker, Klaviyo-style.
          Segment-reference blocks read "Are in / not in <segment>". */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: '#2e3d66' }}>{isRef ? 'Are' : 'Have'}</span>
        {isRef ? (
          <select
            value={block.quantifier === 'none' ? 'none' : 'any'}
            onChange={(e) => onQuantifier(e.target.value)}
            style={{ ...selectStyle, width: 'auto', padding: '8px 8px', fontSize: 14 }}
          >
            <option value="any">in</option>
            <option value="none">not in</option>
          </select>
        ) : (
          <select
            value={block.quantifier}
            onChange={(e) => onQuantifier(e.target.value)}
            style={{ ...selectStyle, width: 'auto', padding: '8px 8px', fontSize: 14 }}
          >
            <option value="any">any</option>
            <option value="none">no</option>
            <option value="two_plus">2 or more</option>
          </select>
        )}
        <ScopePicker block={block} onScope={onScope} onScopeRef={onScopeRef} excludeSegmentId={excludeSegmentId} />
      </div>

      {/* honest zero-data state — generic, driven by the data itself */}
      {zeroData && (
        <div style={{ marginTop: 10, background: '#fbf1dc', borderRadius: 4, padding: '9px 12px', fontSize: 12.5, fontWeight: 500, color: '#8a6d2e', lineHeight: 1.5, maxWidth: 520 }}>
          No {block.entity} records in this dataset yet — “have any” matches no one; “have no” matches all {fmt(totalMembers())} members.
          {entityDef(block.entity)?.note && (
            <div style={{ marginTop: 3, fontWeight: 600 }}>{entityDef(block.entity).note}</div>
          )}
        </div>
      )}

      {blockActive && !isRef && (
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
              {(block.aggregates ?? []).map((a) => (
                <AggregateRow
                  key={`agg-${a.id}`}
                  block={block}
                  agg={a}
                  numericFields={numericFields}
                  onPatch={(p) => onPatchAggregate(a.id, p)}
                  onRemove={() => onRemoveAggregate(a.id)}
                />
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={onAddCondition}
                  style={{
                    padding: '7px 12px', border: '1.5px dashed #c3ccd9', borderRadius: 4,
                    background: 'transparent', color: '#4a6088', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  + Add condition
                </button>
                {block.quantifier !== 'none' && (
                  <button
                    onClick={onAddAggregate}
                    style={{
                      padding: '7px 12px', border: '1.5px dashed #c3ccd9', borderRadius: 4,
                      background: 'transparent', color: '#4a6088', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    + Add total
                  </button>
                )}
              </div>
            </div>
            {block.conditions.length > 0 && (
              <p style={{ ...helperText, marginTop: 7 }}>
                {block.quantifier === 'none'
                  ? `Excludes members holding a ${block.entity} record matching ALL of these together — not any one alone.`
                  : `All conditions must match the same ${block.entity} record.`}
              </p>
            )}
            {(block.aggregates ?? []).length > 0 && block.quantifier !== 'none' && (
              <p style={{ ...helperText, marginTop: 7 }}>
                Totals add up across a member’s matching records.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* Per-member aggregate: total of a numeric field, or a record count,
   across the block's matching records. */
function AggregateRow({ block, agg, numericFields, onPatch, onRemove }) {
  return (
    <div style={{ border: '1px solid #e2e8f1', borderRadius: 4, padding: 10, display: 'flex', gap: 8, background: '#fafbfd' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={agg.fn}
          onChange={(e) => onPatch({ fn: e.target.value, field: e.target.value === 'count' ? null : (agg.field ?? numericFields[0]?.name ?? null) })}
          style={{ ...selectStyle, width: 'auto' }}
        >
          <option value="sum">Total of</option>
          <option value="count">Count of records</option>
        </select>
        {agg.fn === 'sum' && (
          <select value={agg.field ?? ''} onChange={(e) => onPatch({ field: e.target.value })} style={{ ...selectStyle, width: 170 }}>
            {numericFields.map((f) => (
              <option key={f.name} value={f.name}>{f.label}</option>
            ))}
          </select>
        )}
        <select value={agg.op} onChange={(e) => onPatch({ op: e.target.value })} style={{ ...selectStyle, width: 'auto' }}>
          <option value="gt">is more than</option>
          <option value="lt">is less than</option>
        </select>
        <input type="number" value={agg.value} placeholder="0" onChange={(e) => onPatch({ value: e.target.value })} style={{ ...selectStyle, width: 100, textAlign: 'center' }} />
      </div>
      <button
        onClick={onRemove}
        style={{ width: 24, height: 24, flex: 'none', border: 'none', borderRadius: 4, background: 'transparent', color: '#8a95a6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, alignSelf: 'center' }}
      >
        <CloseIcon size={12} />
      </button>
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
        <div key={u.id} style={{ background: '#fff', border: '1px solid #e7edf5', borderRadius: 4, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: u.avBg, color: u.avFg, fontSize: 12.5, fontWeight: 600 }}>
              {u.initials}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1b3a63', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
            {u.matches.length >= 2 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#8a6d2e', background: '#fbf1dc', padding: '3px 7px', borderRadius: 4, flex: 'none' }}>
                {u.matches.length} records
              </span>
            )}
          </div>
          {primary && u.matches.map((p, i) => (
            <div key={i} style={{ margin: '5px 0 0 40px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#5a6b85' }}>
              <ProductIcon size={11} stroke="#5a7db0" />
              <span style={{ color: '#1b3a63', fontWeight: 600 }}>{p.label}</span>
              {p.fact}
            </div>
          ))}
          {primary && u.matches.length === 0 && (
            <div style={{ margin: '5px 0 0 40px', fontSize: 12, fontWeight: 500, color: '#8a95a6' }}>
              Qualifies via an OR path
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* Searchable grouped scope picker. Groups come from the curated
   category layer; search matches entity names, code labels, raw codes
   and field labels — typing "visa" lands on Cards, "maturity" on Loans.
   Click to open (no hover cascades), Enter picks the first match. */
function ScopePicker({ block, onScope, onScopeRef, excludeSegmentId }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const items = [
    ...scopePickerItems(),
    // saved segments are composable scopes — this is also how
    // (A AND B) OR (C AND D) shapes get built
    ...referencableSegments(excludeSegmentId).map((a) => ({
      segmentRef: a.id, label: a.name, catKey: '__segments', group: 'Saved segments',
      noData: false, terms: [{ text: a.name, kind: 'scope' }],
    })),
  ]
  const current = block.segmentRef
    ? { label: segmentById(block.segmentRef)?.name ?? 'deleted segment' }
    : items.find((s) => !s.segmentRef && s.entity === block.entity && (block.codeCategory ?? null) === s.codeCategory)
  const query = q.trim().toLowerCase()

  const visible = items
    .map((it) => {
      if (!query) return { it, via: null, hit: true }
      const m = it.terms.find((t) => t.text.toLowerCase().includes(query))
      return { it, hit: !!m, via: m && m.kind !== 'scope' && m.kind !== 'entity' ? m.text : null }
    })
    .filter((x) => x.hit)
  const groups = []
  for (const v of visible) {
    let g = groups.find((x) => x.key === v.it.catKey)
    if (!g) { g = { key: v.it.catKey, label: v.it.group, rows: [] }; groups.push(g) }
    g.rows.push(v)
  }
  const order = (k) => { const i = PULSATE_CATEGORY_ORDER.indexOf(k); return i === -1 ? 999 : i }
  groups.sort((a, b) => order(a.key) - order(b.key))

  const pick = (it) => {
    if (it.segmentRef) onScopeRef(it.segmentRef)
    else onScope(it.entity, it.codeCategory)
    setOpen(false)
    setQ('')
  }
  const close = () => { setOpen(false); setQ('') }

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => (open ? close() : setOpen(true))}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 4,
          fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          border: '1px solid #d8e0ea', background: '#fff', color: current ? '#1f4a86' : '#8a95a6',
        }}
      >
        {current?.label ?? 'choose data…'}
        <span style={{ fontSize: 10, color: '#8a95a6' }}>▾</span>
      </button>

      {open && (
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 4 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 340, background: '#fff', border: '1px solid #d8e0ea', borderRadius: 4, boxShadow: '0 12px 32px rgba(20,34,60,.18)', zIndex: 5, overflow: 'hidden' }}>
            <div style={{ padding: 10, borderBottom: '1px solid #edf1f6' }}>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && visible.length) pick(visible[0].it)
                  if (e.key === 'Escape') close()
                }}
                placeholder="Search data, types, fields…"
                style={{ ...selectStyle, padding: '8px 10px', fontSize: 14 }}
              />
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', padding: '6px 0' }}>
              {groups.length === 0 && (
                <div style={{ padding: '14px 14px', fontSize: 13.5, fontWeight: 500, color: '#8a95a6' }}>
                  Nothing matches “{q}” — search covers your entities, type labels and field names.
                </div>
              )}
              {groups.map((g) => (
                <div key={g.key}>
                  <div style={{ ...sectionLabel, padding: '7px 14px 3px' }}>{g.label}</div>
                  {g.rows.map(({ it, via }) => {
                    const on = it.segmentRef
                      ? block.segmentRef === it.segmentRef
                      : !block.segmentRef && it.entity === block.entity && it.codeCategory === (block.codeCategory ?? null)
                    return (
                      <button
                        key={it.segmentRef ?? it.entity + '·' + it.codeCategory}
                        onClick={() => pick(it)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                          padding: '8px 14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                          background: on ? '#eef5fc' : 'transparent',
                        }}
                        onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = '#f4f7fb' }}
                        onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 600, color: on ? '#1f4a86' : '#2e3d66' }}>{it.label}</span>
                        {!it.segmentRef && it.label !== it.entity && (
                          <span style={{ fontSize: 11.5, fontWeight: 500, color: '#8a95a6' }}>on {it.entity}</span>
                        )}
                        {it.noData && (
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: '#8a6d2e', background: '#fbf1dc', padding: '1px 7px', borderRadius: 4, flex: 'none' }}>no data yet</span>
                        )}
                        {via && (
                          <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 500, color: '#8a95a6', flex: 'none' }}>matches “{via}”</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </span>
  )
}

function TypeChip({ label, on, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 11px', borderRadius: 4, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
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
  const incomplete = conditionIncomplete(block, condition)

  const changeField = (name) => {
    const f = fields.find((x) => x.name === name)
    onPatch({ field: name, op: operatorsFor(f.type)[0].key, value: '', n: 3 })
  }

  return (
    <div style={{ border: `1px solid ${incomplete ? '#e8cf9a' : '#e2e8f1'}`, borderRadius: 4, padding: 10, display: 'flex', gap: 8, background: incomplete ? '#fffdf5' : '#fafbfd' }}>
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
        {op.hasValueSelect && (
          <select value={condition.value} onChange={(e) => onPatch({ value: e.target.value })} style={{ ...selectStyle, width: 130 }}>
            <option value="">choose…</option>
            {distinctValues(block.entity, field.name).map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        )}
        {field.type !== 'date' && !op.noValue && !op.hasValueSelect && (
          <input type="number" value={condition.value} placeholder="0" onChange={(e) => onPatch({ value: e.target.value })} style={{ ...selectStyle, width: 84, textAlign: 'center' }} />
        )}
        {field.type === 'date' && op.hasN && (
          <>
            <input type="number" min={1} value={condition.n} onChange={(e) => onPatch({ n: e.target.value })} style={{ ...selectStyle, width: 60, textAlign: 'center' }} />
            <span style={{ fontSize: 13.5, fontWeight: 500, color: '#5a6b85' }}>days</span>
          </>
        )}
        {field.type === 'date' && op.hasDate && (
          <input type="date" value={condition.value} onChange={(e) => onPatch({ value: e.target.value })} style={{ ...selectStyle, width: 150 }} />
        )}
        {field.type === 'date' && op.hasDateRange && (
          <>
            <input type="date" value={condition.value} onChange={(e) => onPatch({ value: e.target.value })} style={{ ...selectStyle, width: 150 }} />
            <span style={{ fontSize: 13.5, fontWeight: 500, color: '#5a6b85' }}>and</span>
            <input type="date" value={condition.value2 ?? ''} onChange={(e) => onPatch({ value2: e.target.value })} style={{ ...selectStyle, width: 150 }} />
          </>
        )}
        {incomplete && (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#8a6d2e', background: '#fbf1dc', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
            needs a date
          </span>
        )}
        {/* what the model actually knows about this field: its type, and
            the mapped semantic role when one exists */}
        <span style={{ fontSize: 11, fontWeight: 500, color: '#8a95a6', background: '#e9ecf7', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
          {field.type}{field.role ? ` · ${field.role}` : ''}
        </span>
      </div>
      <button
        onClick={onRemove}
        style={{ width: 24, height: 24, flex: 'none', border: 'none', borderRadius: 4, background: 'transparent', color: '#8a95a6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, alignSelf: 'center' }}
      >
        <CloseIcon size={12} />
      </button>
    </div>
  )
}
