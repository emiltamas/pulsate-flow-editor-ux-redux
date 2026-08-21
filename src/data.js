import { SYMITAR_STATS, SYMITAR_ACCOUNTS } from './symitarDataset.js'
export { SYMITAR_STATS }

/* ══ Entity-agnostic data core ═══════════════════════════════════════
   The UI never assumes what an FI's data is. Everything the segment and
   journey builders render comes from the LIVE registry — the ENTITY_DEF /
   FIELD_DEF / CODE_MAP rows the ingestion created — and rules evaluate
   against generic records (RECORD → VALUE), whatever the entities are.

   REGISTRY:  [{ name, category, purpose, fields:[{name,label,type,role}], codeField }]
   MEMBERS:   [{ id, records: { [entityName]: [{ key, status, holders, values }] } }]
   Values are normalized on hydration: dates → day offsets from the file
   date, numbers → Number, bools → boolean; a missing key means not set. */

export let REGISTRY = []
let MEMBERS = []

const normalizeValues = (def, raw, fileDate) => {
  const out = {}
  for (const f of def.fields) {
    const v = raw[f.name]
    if (v === undefined || v === null) continue
    if (f.type === 'date') {
      const d = Math.round((new Date(v) - new Date(fileDate)) / 86400000)
      if (Number.isFinite(d)) out[f.name] = d
    } else if (f.type === 'currency' || f.type === 'number') {
      const n = Number(v)
      if (Number.isFinite(n)) out[f.name] = n
    } else if (f.type === 'bool') {
      out[f.name] = v === 'true' || v === true
    } else {
      out[f.name] = String(v)
    }
  }
  return out
}

/* Fallback registry + records built from the bundled sanitized dataset,
   used only when the SQLite API is not available (fresh clone). */
const FALLBACK_REGISTRY = [
  {
    name: 'Loans', category: 'loan', purpose: 'both', codeField: 'Loan Type',
    fields: [
      { name: 'Loan Type', label: 'Loan Type', type: 'string', role: 'code' },
      { name: 'Loan Balance', label: 'Loan Balance', type: 'currency', role: 'balance' },
      { name: 'Payment', label: 'Payment', type: 'currency', role: null },
      { name: 'Interest Rate', label: 'Interest Rate', type: 'number', role: 'rate' },
      { name: 'Due Date', label: 'Due Date', type: 'date', role: 'recurring_date' },
      { name: 'Maturity Date', label: 'Maturity Date', type: 'date', role: null },
    ],
  },
  {
    name: 'Member Contact', category: 'member', purpose: 'campaign', codeField: null,
    fields: [
      { name: 'Has Email', label: 'Has Email', type: 'bool', role: null },
      { name: 'Has Mobile', label: 'Has Mobile', type: 'bool', role: null },
    ],
  },
]

/* Platform-declared entities every FI gets. platform: true = no
   connected source feeds them (records stream from the SDK in
   production); zero records here is the honest state, and the existing
   block machinery already gives the right semantics: Has any App Events
   = event recorded, Has none = never, Has 2+ = occurrence count,
   Occurred At = recency. */
export const RESERVED_ENTITIES = [
  {
    name: 'App Events', category: 'behavior', purpose: 'segment', codeField: 'Event Name',
    platform: true,
    note: 'No app events ingested in this prototype — production streams these live from the mobile SDK.',
    fields: [
      { name: 'Event Name', label: 'Event Name', type: 'string', role: 'code' },
      { name: 'Occurred At', label: 'Occurred At', type: 'date', role: null },
    ],
  },
]

export const entityRecordCount = (entityName) =>
  MEMBERS.reduce((s, m) => s + (m.records[entityName]?.length ?? 0), 0)

const buildFallback = () => {
  REGISTRY = [...FALLBACK_REGISTRY, ...RESERVED_ENTITIES]
  MEMBERS = SYMITAR_ACCOUNTS.map((a) => ({
    id: a.id,
    records: {
      Loans: a.loans.map((l, i) => ({
        key: `${a.id}:${i}`, status: 'open', holders: 1 + (a.joint ? 1 : 0),
        values: {
          ...(l.code != null ? { 'Loan Type': l.code } : {}),
          ...(l.balance != null ? { 'Loan Balance': l.balance } : {}),
          ...(l.payment != null ? { Payment: l.payment } : {}),
          ...(l.rate != null ? { 'Interest Rate': l.rate } : {}),
          ...(l.dueInDays != null ? { 'Due Date': l.dueInDays } : {}),
          ...(l.maturityInDays != null ? { 'Maturity Date': l.maturityInDays } : {}),
        },
      })),
      'Member Contact': [{ key: `${a.id}:contact`, status: 'open', holders: 1, values: { 'Has Email': a.hasEmail, 'Has Mobile': a.hasMobile } }],
    },
  }))
}
buildFallback()

/* Hydrate everything from the SQLite bootstrap payload. */
export function hydrateDataset({ accounts, stats, registry, members }) {
  SYMITAR_ACCOUNTS.length = 0
  SYMITAR_ACCOUNTS.push(...accounts)
  for (const k of Object.keys(SYMITAR_STATS)) delete SYMITAR_STATS[k]
  Object.assign(SYMITAR_STATS, stats)
  if (registry?.length && members?.length) {
    REGISTRY = [...registry, ...RESERVED_ENTITIES]
    MEMBERS = members.map((m) => ({
      id: m.id,
      records: Object.fromEntries(
        Object.entries(m.records).map(([ent, recs]) => {
          const def = registry.find((e) => e.name === ent)
          return [ent, recs.map((r) => ({ ...r, values: def ? normalizeValues(def, r.values, stats.fileDate) : r.values }))]
        })
      ),
    }))
  } else {
    buildFallback()
  }
}

export const totalMembers = () => MEMBERS.length
export const entityDef = (name) => REGISTRY.find((e) => e.name === name) ?? null

/* Entities a marketer can build segment rules on: anything with instance
   records and segment purpose. Nothing is hardcoded — a new ENTITY_DEF
   (offers, eligibility, anything) appears here automatically. */
export const segmentEntities = () =>
  REGISTRY.filter((e) => e.purpose === 'segment' || e.purpose === 'both')

/* The curated semantic layer: pulsate_category on ENTITY_DEF is how many
   FI-named entities stay ORGANIZED without renaming them. Entity names
   and fields are always the FI's; categories are ours, used only for
   grouping and defaults. */
export const PULSATE_CATEGORY_ORDER = ['loan', 'deposit', 'certificate', 'card', 'offer', 'eligibility', 'behavior', 'member', 'UNKNOWN']
export const categoryLabel = (c) =>
  c === 'UNKNOWN' || !c ? 'Uncategorized' : c === 'member' ? 'Member profile' : c[0].toUpperCase() + c.slice(1) + 's'

/* Builder scopes: the top level marketers pick from. Categories come
   from TWO places the model supports — the entity's own category, and
   the per-code categories mapped in the catalog. An entity whose codes
   span several categories (this CU's cards ride on Loans records)
   contributes one scope per category: {entity, codeCategory} filters
   records DYNAMICALLY by their code's current category mapping, so a
   re-categorized code moves scopes instantly. */
export const segmentScopes = () => {
  const out = []
  for (const e of segmentEntities()) {
    const types = entityTypes(e.name)
    const cats = [...new Set(types.map((t) => activeCodeMap.get(t.code)?.category ?? null))]
    const realCats = PULSATE_CATEGORY_ORDER.filter((c) => cats.includes(c))
    if (!e.codeField || realCats.length === 0) {
      out.push({ entity: e.name, codeCategory: null, label: e.name })
      continue
    }
    for (const c of realCats) out.push({ entity: e.name, codeCategory: c, label: categoryLabel(c) })
    if (cats.includes(null)) out.push({ entity: e.name, codeCategory: 'UNKNOWN', label: 'Uncategorized' })
  }
  return out
}

/* Scope-picker items: everything the searchable picker can match — the
   scope's own label, its entity name, and the vocabulary inside it
   (code labels, raw codes, field labels). Typing "visa" lands on Cards;
   "maturity" surfaces Loans. Grouped by the curated category layer. */
export const scopePickerItems = () =>
  segmentScopes().map((s) => {
    const def = entityDef(s.entity)
    const catKey = s.codeCategory === 'UNKNOWN' ? 'UNKNOWN' : s.codeCategory ?? def?.category ?? 'UNKNOWN'
    const codes = entityTypes(s.entity, s.codeCategory ?? null)
    const fields = (def?.fields ?? []).filter((f) => f.name !== def?.codeField)
    return {
      ...s,
      catKey,
      group: categoryLabel(catKey),
      noData: entityRecordCount(s.entity) === 0,
      terms: [
        { text: s.label, kind: 'scope' },
        { text: s.entity, kind: 'entity' },
        ...codes.flatMap((c) => [{ text: c.label, kind: 'type' }, { text: c.code, kind: 'type' }]),
        ...fields.map((f) => ({ text: f.label, kind: 'field' })),
      ],
    }
  })

/* The category scope a rule over this entity should default to: the
   entity's own category when its codes actually carry it, else none. */
export const scopeCategoryFor = (entityName) => {
  const def = entityDef(entityName)
  if (!def?.codeField) return null
  const hasOwn = entityTypes(entityName).some((t) => activeCodeMap.get(t.code)?.category === def.category)
  return hasOwn ? def.category : null
}

/* Condition fields for an entity = its typed fields minus the code field
   (the code is the scope chips, not a condition). */
export const fieldsFor = (rule) => {
  const def = rule?.entity ? entityDef(rule.entity) : null
  return def ? def.fields.filter((f) => f.name !== def.codeField) : []
}

/* No synced-segment sources or geofences exist for this FI yet — these
   stay empty until a real source feeds them. Surfaces that list them
   render designed empty states, never invented rows. */
export const SEGMENTS = []
export const GEOFENCES = []

const TAG_COLORS = {
  Smart: '#1f6f4a', Uploaded: '#7a4fc0', Manual: '#2f6fc4', System: '#8a6d2e', Predicted: '#c05a8a', Rule: '#1f4a86',
  Branch: '#2f6fc4', Dealer: '#7a4fc0', Region: '#1f6f4a', Custom: '#5a6b85', Push: '#c05a8a',
}
export const tagColor = (g) => TAG_COLORS[g] || '#5a6b85'

export const fmt = (n) => n.toLocaleString('en-US')

export const trigLabel = (t) => (t === 'enter' ? 'enters' : t === 'exit' ? 'exits' : 'dwells')

export const CHANNELS = {
  push: { label: 'Push notification', short: 'Push', desc: 'Lock screen and notification tray', feedCompanion: true },
  inapp: { label: 'In-app message', short: 'In-app', desc: 'Shown while using the app', feedCompanion: true },
  feed: { label: 'Feed post', short: 'Feed', desc: 'Card published to the app feed', feedCompanion: false },
}
export const CHANNEL_ORDER = ['push', 'inapp', 'feed']

const AVATAR_PALETTE = [
  ['#1f6f4a', '#e2f4ea'], ['#7a4fc0', '#efe8fb'], ['#2f6fc4', '#e6effb'],
  ['#8a6d2e', '#fbf1dc'], ['#c05a8a', '#fbe8f1'],
]

const hash = (s) => {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

export const QUANTIFIERS = [
  { key: 'any', label: 'Has any' },
  { key: 'none', label: 'Has none' },
  { key: 'two_plus', label: 'Has 2+' },
]

/* Operator families per field type. Every type supports set/blank checks
   (false-vs-never-set must stay distinguishable); dates get relative
   past/future windows AND fixed calendar-date comparisons. */
export const OPERATORS = {
  currency: [
    { key: 'gt', label: 'is more than' },
    { key: 'lt', label: 'is less than' },
    { key: 'not_set', label: 'is not set', noValue: true },
    { key: 'is_set', label: 'is set', noValue: true },
  ],
  number: [
    { key: 'gt', label: 'is more than' },
    { key: 'lt', label: 'is less than' },
    { key: 'not_set', label: 'is not set', noValue: true },
    { key: 'is_set', label: 'is set', noValue: true },
  ],
  date: [
    { key: 'next_n', label: 'is in the next N days', hasN: true },
    { key: 'more_than_n_away', label: 'is more than N days away', hasN: true },
    { key: 'tomorrow', label: 'is tomorrow' },
    { key: 'before_date', label: 'is before', hasDate: true },
    { key: 'after_date', label: 'is after', hasDate: true },
    { key: 'between_dates', label: 'is between', hasDateRange: true },
    { key: 'past_n', label: 'was more than N days ago', hasN: true },
    { key: 'not_set', label: 'is not set', noValue: true },
    { key: 'is_set', label: 'is set', noValue: true },
  ],
  bool: [
    { key: 'is_true', label: 'is yes', noValue: true },
    { key: 'is_false', label: 'is no', noValue: true },
    { key: 'not_set', label: 'is not set', noValue: true },
  ],
  string: [
    { key: 'is_set', label: 'is set', noValue: true },
    { key: 'not_set', label: 'is not set', noValue: true },
  ],
}
export const operatorsFor = (type) => OPERATORS[type] ?? OPERATORS.number

/* Days from today to a yyyy-mm-dd string; null when unparsable. */
const daysUntil = (v) => {
  if (!v) return null
  const d = new Date(v + 'T00:00:00')
  if (isNaN(d)) return null
  return Math.round((d - new Date().setHours(0, 0, 0, 0)) / 86400000)
}

const fmtDateValue = (v) => {
  if (!v) return '…'
  const d = new Date(v + 'T00:00:00')
  return isNaN(d) ? '…' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/* ── segments = AND of blocks ─────────────────────────────────────────
   A BLOCK is the atom: quantifier over one entity's records, optionally
   scoped to a code category (resolved live through the catalog mapping),
   with conditions that must all match the SAME record. types are RAW
   code values (labels can change; codes are stable).

   A SEGMENT is { blocks: [block, ...] } — a member belongs iff EVERY
   block is satisfied. The first non-'none' block is PRIMARY: its
   matching records drive per-record enrollment, personalization tokens
   and sample factlines; 'none' blocks are person-level filters.

   Factories, not constants — shared array refs would alias across
   audiences. */
export const newBlock = () => ({ quantifier: 'any', entity: null, codeCategory: null, types: [], conditions: [] })
export const emptySegment = () => ({ blocks: [newBlock()], joins: [] })

/* Legacy single-rule objects (older seeds, in-flight builder state)
   wrap to a one-block segment; every segment-level function funnels
   through this. */
export const blocksOf = (x) => (!x ? [] : Array.isArray(x.blocks) ? x.blocks : [x])

/* joins[i] connects blocks i and i+1: 'AND' or 'OR'. Maximal OR-runs
   form groups; groups are ANDed. Missing/short/legacy joins default to
   AND, so every pre-joins segment evaluates exactly as before. */
export const joinsOf = (seg) => {
  const n = blocksOf(seg).length
  const js = Array.isArray(seg?.joins) ? seg.joins : []
  return Array.from({ length: Math.max(0, n - 1) }, (_, i) => (js[i] === 'OR' ? 'OR' : 'AND'))
}

/* Structural grouping over ALL blocks first, then activity-filter within
   groups, then drop empty groups — so an inactive block inside an OR run
   can never merge two AND-separated groups. Member ∈ segment iff every
   group has ≥1 satisfied block. */
export const segmentGroups = (seg) => {
  const bs = blocksOf(seg)
  const js = joinsOf(seg)
  const groups = []
  bs.forEach((b, i) => {
    if (i === 0 || js[i - 1] === 'AND') groups.push([b])
    else groups[groups.length - 1].push(b)
  })
  return groups.map((g) => g.filter(ruleActive)).filter((g) => g.length)
}

/* Save-time normalization: drop inactive blocks while preserving GROUP
   semantics — two kept blocks stay OR-joined iff they were in the same
   structural OR group, else AND (matches how segmentGroups evaluates). */
export const compactSegment = (seg) => {
  const bs = blocksOf(seg)
  const js = joinsOf(seg)
  const groupIdx = []
  let g = 0
  bs.forEach((_, i) => {
    if (i > 0 && js[i - 1] === 'AND') g++
    groupIdx.push(g)
  })
  const blocks = []
  const joins = []
  let lastGroup = null
  bs.forEach((b, i) => {
    if (!ruleActive(b)) return
    if (blocks.length > 0) joins.push(groupIdx[i] === lastGroup ? 'OR' : 'AND')
    blocks.push(b)
    lastGroup = groupIdx[i]
  })
  return { blocks, joins }
}

/* N-value with default, treating 0 as a real value ("more than 0 days
   ago" = any past date). */
const nOr = (v, d) => {
  if (v === '' || v == null) return d
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

export const ruleActive = (rule) => !!rule?.entity && !!entityDef(rule.entity)

/* ── code labels: the FI's vocabulary, from the live catalog ───────── */
let activeCodeMap = new Map()
export const setActiveCodeMap = (codes) => {
  activeCodeMap = new Map(codes.map((c) => [c.code, c]))
}
export const codeLabel = (code) => {
  const m = activeCodeMap.get(code)
  return m && m.label.trim() ? m.label : `Code ${code}`
}
export const codeIsLabeled = (code) => !!activeCodeMap.get(code)?.label.trim()

/* Scope chips for an entity: every raw code seen in its data, labeled
   where the catalog labels it, shown raw where it doesn't. Unlabeled
   codes stay targetable — the marketer sees exactly what the data says. */
export const entityTypes = (entityName, codeCategory = undefined) => {
  const def = entityDef(entityName)
  if (!def?.codeField) return []
  const counts = new Map()
  for (const m of MEMBERS) {
    for (const r of m.records[entityName] ?? []) {
      const c = r.values[def.codeField]
      if (c != null) counts.set(c, (counts.get(c) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => ({ code, label: codeLabel(code), labeled: codeIsLabeled(code), count }))
    .filter((t) => {
      if (codeCategory === undefined || codeCategory === null) return true
      const cat = activeCodeMap.get(t.code)?.category ?? null
      return codeCategory === 'UNKNOWN' ? cat === null : cat === codeCategory
    })
}

export const unlabeledRecordCount = (entityName) => {
  const def = entityDef(entityName)
  if (!def?.codeField) return 0
  let n = 0
  for (const m of MEMBERS) {
    for (const r of m.records[entityName] ?? []) {
      const c = r.values[def.codeField]
      if (c != null && !codeIsLabeled(c)) n++
    }
  }
  return n
}

/* ── rule text ─────────────────────────────────────────────────────── */
export function conditionText(rule, c) {
  const f = fieldsFor(rule).find((x) => x.name === c.field)
  if (!f) return ''
  const name = f.label.toLowerCase()
  if (c.op === 'not_set') return `${name} is not set`
  if (c.op === 'is_set') return `${name} is set`
  if (c.op === 'is_true') return `${name} is yes`
  if (c.op === 'is_false') return `${name} is no`
  if (f.type === 'date') {
    if (c.op === 'tomorrow') return `${name} is tomorrow`
    if (c.op === 'next_n') return `${name} is in the next ${nOr(c.n, 3)} days`
    if (c.op === 'more_than_n_away') return `${name} is more than ${nOr(c.n, 30)} days away`
    if (c.op === 'before_date') return `${name} is before ${fmtDateValue(c.value)}`
    if (c.op === 'after_date') return `${name} is after ${fmtDateValue(c.value)}`
    if (c.op === 'between_dates') return `${name} is between ${fmtDateValue(c.value)} and ${fmtDateValue(c.value2)}`
    return nOr(c.n, 30) === 0 ? `${name} is in the past` : `${name} was more than ${nOr(c.n, 30)} days ago`
  }
  // formatting comes ONLY from what the model declares: type → $,
  // semantic_role 'rate' → % — never from guessing at labels
  const op = operatorsFor(f.type).find((o) => o.key === c.op)
  const v = f.type === 'currency'
    ? `$${fmt(Number(c.value) || 0)}`
    : `${Number(c.value) || 0}${f.role === 'rate' ? '%' : ''}`
  return `${name} ${op?.label ?? c.op} ${v}`
}

/* Block-level sentence — segments join these with AND. */
export function ruleSentence(rule) {
  if (!ruleActive(rule)) return null
  const plural = rule.quantifier === 'two_plus'
  const lead = rule.quantifier === 'any' ? 'Any' : rule.quantifier === 'none' ? 'No' : '2 or more'
  let scope = `${rule.entity} record${plural ? 's' : ''}`
  if (rule.codeCategory) {
    const cl = rule.codeCategory === 'UNKNOWN' ? 'Uncategorized' : categoryLabel(rule.codeCategory)
    if (cl !== rule.entity) scope += ` in ${cl}` // skip "Loans record in Loans"
  }
  if (rule.types.length) scope += ` of type ${rule.types.map((c) => codeLabel(c)).join(' or ')}`
  const conds = rule.conditions.length
    ? ` where ${rule.conditions.map((c) => conditionText(rule, c)).join(' and ')}`
    : ''
  return `${lead} ${scope}${conds}`
}

/* ── evaluation: generic over records ─────────────────────────────── */
const conditionsMatch = (def, rec, rule) =>
  rule.conditions.every((c) => {
    const f = def.fields.find((x) => x.name === c.field)
    if (!f) return false
    const v = rec.values[c.field]
    if (c.op === 'not_set') return v === undefined
    if (c.op === 'is_set') return v !== undefined
    if (c.op === 'is_true') return v === true
    if (c.op === 'is_false') return v === false
    if (v === undefined) return false // unset never matches a value comparison
    if (f.type === 'date') {
      if (c.op === 'tomorrow') return v === 1
      if (c.op === 'next_n') return v >= 0 && v <= nOr(c.n, 3)
      if (c.op === 'more_than_n_away') return v > nOr(c.n, 30)
      if (c.op === 'before_date') { const t = daysUntil(c.value); return t != null && v <= t }
      if (c.op === 'after_date') { const t = daysUntil(c.value); return t != null && v > t }
      if (c.op === 'between_dates') {
        const t1 = daysUntil(c.value)
        const t2 = daysUntil(c.value2)
        return t1 != null && t2 != null && v >= Math.min(t1, t2) && v <= Math.max(t1, t2)
      }
      return v < -nOr(c.n, 30)
    }
    const cv = Number(c.value) || 0
    return c.op === 'gt' ? v > cv : v < cv
  })

const recordMatches = (def, rec, rule) => {
  const code = def.codeField ? rec.values[def.codeField] : null
  // category scope filters DYNAMICALLY through the live code mapping —
  // re-categorizing a code moves its records between scopes
  if (rule.codeCategory) {
    const cat = code != null ? activeCodeMap.get(code)?.category ?? null : null
    if (rule.codeCategory === 'UNKNOWN' ? cat !== null : cat !== rule.codeCategory) return false
  }
  if (rule.types.length && !rule.types.includes(code)) return false
  return conditionsMatch(def, rec, rule)
}

export const memberSatisfies = (matchCount, quantifier) =>
  quantifier === 'none' ? matchCount === 0 : quantifier === 'two_plus' ? matchCount >= 2 : matchCount >= 1

/* A condition whose calendar input is still empty matches nothing — the
   evaluation stays strict (honest zero), but the builder flags it so a
   zero reach never goes unexplained. */
export const conditionIncomplete = (block, c) => {
  const f = fieldsFor(block).find((x) => x.name === c.field)
  if (!f) return false
  const op = operatorsFor(f.type).find((o) => o.key === c.op)
  if (!op) return false
  if (op.hasDate) return !c.value
  if (op.hasDateRange) return !c.value || !c.value2
  return false
}

export const segmentIncompleteCount = (seg) =>
  blocksOf(seg).filter(ruleActive).reduce((s, b) => s + b.conditions.filter((c) => conditionIncomplete(b, c)).length, 0)

const blockInstances = (member, block) => {
  const def = entityDef(block.entity)
  if (!def) return []
  return (member.records[block.entity] ?? []).filter((r) => recordMatches(def, r, block))
}

/* ── segment evaluation: intersection of per-block member sets ─────── */
const activeBlocks = (seg) => blocksOf(seg).filter(ruleActive)

export const segmentActive = (seg) => activeBlocks(seg).length > 0

/* The block whose matching records enroll and personalize: the first
   active block that asks for presence. All-'none' segments have no
   primary — they are pure person-level filters. */
export const primaryBlock = (seg) => activeBlocks(seg).find((b) => b.quantifier !== 'none') ?? null

/* Per-member evaluation over OR-groups: the member is in the segment iff
   EVERY group has at least one satisfied block. Returns null when the
   member is out; else { primaryMatches, satisfiedPrimary }. */
const memberInGroups = (m, groups, primary) => {
  let primaryMatches = []
  let satisfiedPrimary = false
  for (const group of groups) {
    let groupOk = false
    for (const b of group) {
      const matches = blockInstances(m, b)
      const ok = memberSatisfies(matches.length, b.quantifier)
      if (b === primary && ok) { primaryMatches = matches; satisfiedPrimary = true }
      if (ok) groupOk = true
    }
    if (!groupOk) return null
  }
  return { primaryMatches, satisfiedPrimary }
}

export function segmentReach(seg) {
  const groups = segmentGroups(seg)
  if (!groups.length) return null
  const primary = primaryBlock(seg)
  let members = 0
  let records = 0
  let memberLevel = 0
  for (const m of MEMBERS) {
    const r = memberInGroups(m, groups, primary)
    if (!r) continue
    members++
    if (primary && r.satisfiedPrimary) records += r.primaryMatches.length
    else if (primary) memberLevel++
  }
  return {
    members,
    products: primary ? records : null,
    memberLevel,
    source: 'extract',
    unlabeled: [...new Set(groups.flat().map((b) => b.entity))].reduce((s, e) => s + unlabeledRecordCount(e), 0),
  }
}

export const segmentSentence = (seg) => {
  const parts = segmentGroups(seg).map((group) => {
    const ss = group.map((b) => ruleSentence(b)).filter(Boolean)
    if (!ss.length) return null
    return ss.length > 1 ? `(${ss.join(' OR ')})` : ss[0]
  }).filter(Boolean)
  return parts.length ? parts.join(' AND ') : null
}

export const segmentPlural = (seg) => `${primaryBlock(seg)?.entity ?? 'record'} records`

/* Human factline for any record. Salience comes from semantic roles the
   FI mapped (balance, recurring_date) — when no roles exist we don't
   guess which field matters; we show the first set values with their
   own labels. */
export function recordFactline(entityName, rec) {
  const def = entityDef(entityName)
  if (!def) return ''
  const parts = []
  const cur = def.fields.find((f) => f.role === 'balance')
  if (cur && rec.values[cur.name] != null) parts.push(`$${fmt(rec.values[cur.name])}`)
  const dt = def.fields.find((f) => f.role === 'recurring_date')
  if (dt) {
    const v = rec.values[dt.name]
    const label = dt.label
    parts.push(
      v === undefined ? `no ${label.toLowerCase()} on file`
        : v < 0 ? `${label} ${-v}d ago`
        : v === 0 ? `${label} today`
        : v === 1 ? `${label} tomorrow`
        : `${label} in ${v} days`
    )
  }
  if (parts.length) return parts.join(' · ')
  // no roles mapped on this entity — plain label: value facts, no guessing
  return def.fields
    .filter((f) => f.name !== def.codeField && rec.values[f.name] !== undefined)
    .slice(0, 2)
    .map((f) => {
      const v = rec.values[f.name]
      const shown = f.type === 'currency' ? `$${fmt(v)}` : f.type === 'date' ? `${v >= 0 ? 'in ' + v : -v} days${v < 0 ? ' ago' : ''}` : String(v)
      return `${f.label} ${shown}`
    })
    .join(' · ')
}

export const recordTypeLabel = (entityName, rec) => {
  const def = entityDef(entityName)
  const code = def?.codeField ? rec.values[def.codeField] : null
  return code != null ? codeLabel(code) : entityName
}

/* Real matched members for drill-ins: members satisfying EVERY block,
   with the PRIMARY block's matching records shown per member (empty for
   all-'none' segments). Sequential extract IDs with deterministic
   synthetic display names (real names never leave the source files).
   Multi-match members sort first. */
export function datasetMatchedMembers(seg, limit = 8) {
  const groups = segmentGroups(seg)
  if (!groups.length) return []
  const primary = primaryBlock(seg)
  const out = []
  for (const m of MEMBERS) {
    const r = memberInGroups(m, groups, primary)
    if (!r) continue
    const matches = primary && r.satisfiedPrimary
      ? r.primaryMatches.map((rec) => ({ label: recordTypeLabel(primary.entity, rec), fact: recordFactline(primary.entity, rec) }))
      : []
    const h = hash(m.id)
    const f = FIRST[h % FIRST.length]
    const l = LAST[(h >>> 3) % LAST.length]
    const [avFg, avBg] = AVATAR_PALETTE[hash(f + l) % AVATAR_PALETTE.length]
    out.push({
      name: `${f} ${l}`,
      email: `member-${m.id.toLowerCase()}@example.com`,
      initials: f[0] + l[0],
      id: '#' + m.id,
      avFg,
      avBg,
      matches,
    })
  }
  return out.sort((x, y) => y.matches.length - x.matches.length).slice(0, limit)
}

/* Reach for an audience object — always the live evaluation. Never
   returns null: inactive segments read as zero reach. */
export function audienceReach(a) {
  if (a.rule) return segmentReach(a.rule) ?? { members: 0, products: null, memberLevel: 0, unlabeled: 0 }
  return { members: a.users ?? 0, products: null }
}

/* Deterministic "AI" phrase parser — keyword matching, no model calls.
   Entity detection runs against the LIVE registry names and the FI's
   live code labels; nothing is hardcoded. */
export function parseAudiencePhrase(text) {
  const raw = (text || '').toLowerCase()
  if (!raw.trim()) return null

  // "…and no card" style tails become a 'none' filter block. Split
  // BEFORE quantifier detection so the tail can't read as "has none".
  const split = raw.split(/\band (?:has |have |with |holds? )?(?:no|none of|without)\b/)
  const t = split[0]
  const noneText = split[1]?.trim() || null

  let entity = null
  const types = []
  for (const def of segmentEntities()) {
    // match the FI's own labels first (they imply the entity)
    for (const ty of entityTypes(def.name)) {
      if (ty.labeled && t.includes(ty.label.toLowerCase())) {
        entity = def.name
        if (!types.includes(ty.code)) types.push(ty.code)
      }
    }
    // then the entity's own name, singular or plural
    const n = def.name.toLowerCase()
    if (!entity && (t.includes(n) || t.includes(n.replace(/s$/, '')))) entity = def.name
  }
  if (!entity) return null
  const def = entityDef(entity)

  const blankRe = /(?:with |having )?(?:no|missing|without an?) ([a-z ]+?) (?:date )?(?:on file|set)\b/
  const tq = t.replace(blankRe, '')

  let quantifier = 'any'
  if (/\bno\b|\bwithout\b|doesn'?t have|\bnone\b/.test(tq)) quantifier = 'none'
  else if (/two or more|2 or more|\b2\+|more than one|\bmultiple\b/.test(tq)) quantifier = 'two_plus'

  const conditions = []
  let id = 1
  let m
  // meaning resolves through mapped roles first; a label-keyword match is
  // the fallback (the user typed the field's own name — that's honest)
  const dateField = (kw) =>
    (kw === 'due' ? def.fields.find((f) => f.role === 'recurring_date') : null) ??
    def.fields.find((f) => f.type === 'date' && f.label.toLowerCase().includes(kw))
  const currencyField = () => def.fields.find((f) => f.role === 'balance') ?? def.fields.find((f) => f.type === 'currency' && f.label.toLowerCase().includes('balance'))

  if ((m = t.match(blankRe))) {
    const f = def.fields.find((x) => x.label.toLowerCase().includes(m[1].trim())) ?? dateField(m[1].trim())
    if (f) conditions.push({ id: id++, field: f.name, op: 'not_set', value: '', n: 3 })
  }
  const due = dateField('due')
  if (due) {
    if ((m = t.match(/due (?:in |within )?(?:the )?next (\d+) days?/))) {
      conditions.push({ id: id++, field: due.name, op: 'next_n', value: '', n: Number(m[1]) })
    } else if (/due tomorrow/.test(t)) {
      conditions.push({ id: id++, field: due.name, op: 'tomorrow', value: '', n: 3 })
    } else if ((m = t.match(/overdue (?:by )?(?:more than )?(\d+) days?/))) {
      conditions.push({ id: id++, field: due.name, op: 'past_n', value: '', n: Number(m[1]) })
    } else if (/past due|overdue/.test(t)) {
      conditions.push({ id: id++, field: due.name, op: 'past_n', value: '', n: 0 })
    }
  }
  const mat = dateField('matur')
  if (mat && (m = t.match(/matur\w* (?:in |within )?(?:the )?next (\d+) days?/))) {
    conditions.push({ id: id++, field: mat.name, op: 'next_n', value: '', n: Number(m[1]) })
  }
  const bal = currencyField()
  if (bal) {
    if ((m = t.match(/balance (?:of )?(?:over|above|more than|greater than) \$?([\d,]+)/))) {
      conditions.push({ id: id++, field: bal.name, op: 'gt', value: m[1].replace(/,/g, ''), n: 3 })
    } else if ((m = t.match(/balance (?:of )?(?:under|below|less than) \$?([\d,]+)/))) {
      conditions.push({ id: id++, field: bal.name, op: 'lt', value: m[1].replace(/,/g, ''), n: 3 })
    }
  }

  // scope the main block: matched codes' shared category, else the
  // entity's own default category
  const typeCats = [...new Set(types.map((c) => activeCodeMap.get(c)?.category ?? null))]
  const codeCategory = typeCats.length === 1 && typeCats[0] ? typeCats[0] : scopeCategoryFor(entity)
  const blocks = [{ quantifier, entity, codeCategory, types, conditions }]

  // resolve the "and no …" tail against live scopes, code labels, and
  // entity names — in that order
  if (noneText) {
    let noneBlock = null
    for (const s of segmentScopes()) {
      const l = s.label.toLowerCase()
      if (noneText.includes(l) || noneText.includes(l.replace(/s$/, ''))) {
        noneBlock = { quantifier: 'none', entity: s.entity, codeCategory: s.codeCategory, types: [], conditions: [] }
        break
      }
    }
    if (!noneBlock) {
      for (const e of segmentEntities()) {
        for (const ty of entityTypes(e.name)) {
          if (ty.labeled && noneText.includes(ty.label.toLowerCase())) {
            noneBlock = { quantifier: 'none', entity: e.name, codeCategory: activeCodeMap.get(ty.code)?.category ?? null, types: [ty.code], conditions: [] }
            break
          }
        }
        if (noneBlock) break
        const n = e.name.toLowerCase()
        if (noneText.includes(n) || noneText.includes(n.replace(/s$/, ''))) {
          noneBlock = { quantifier: 'none', entity: e.name, codeCategory: scopeCategoryFor(e.name), types: [], conditions: [] }
          break
        }
      }
    }
    if (noneBlock) blocks.push(noneBlock)
  }

  return { blocks, joins: blocks.slice(1).map(() => 'AND') }
}

/* Performance metrics come only from observed delivery/engagement
   events. No messages have been sent from this prototype, so there is
   no performance data — the view says so instead of simulating it. */

/* ── audiences as first-class objects ────────────────────────────── */

/* Role lookup: the entity+field pair that carries a given semantic role.
   This is how anything needing MEANING (playbooks, gap checks, demo
   rules) finds its field — never by hardcoding a field name. */
export const roleField = (role) => {
  for (const e of segmentEntities()) {
    const f = e.fields.find((x) => x.role === role)
    if (f) return { entity: e.name, field: f.name, label: f.label }
  }
  return null
}

const roleRule = (role, conditions, quantifier = 'any') => {
  const rf = roleField(role)
  if (!rf) return null
  return { blocks: [{ quantifier, entity: rf.entity, codeCategory: scopeCategoryFor(rf.entity), types: [], conditions: conditions(rf) }] }
}

export const DEMO_RULE = roleRule('recurring_date', (rf) => [{ id: 1, field: rf.field, op: 'next_n', value: '', n: 3 }])

/* The cross-sell pair, if this FI's data carries it: two categories on
   the same entity → "has any X, has none Y". Data-driven, never
   invented. */
const crossSellBlocks = () => {
  const scopes = segmentScopes()
  const loan = scopes.find((s) => s.codeCategory === 'loan')
  const card = scopes.find((s) => s.codeCategory === 'card' && s.entity === loan?.entity)
  if (!loan || !card) return null
  return [
    { quantifier: 'any', entity: loan.entity, codeCategory: 'loan', types: [], conditions: [] },
    { quantifier: 'none', entity: card.entity, codeCategory: 'card', types: [], conditions: [] },
  ]
}

/* Every seeded audience is rule-backed and evaluates live against the
   ingested data. Rules that need meaning bind to semantic roles; the
   maturity one binds to this FI's own field name (their vocabulary,
   their data — factual, not invented). */
export const seedAudiences = () => {
  const due = roleField('recurring_date')
  const bal = roleField('balance')
  const firstEntity = segmentEntities()[0]?.name
  const cat = (e) => scopeCategoryFor(e)
  const xsell = crossSellBlocks()
  return [
    due && bal && { id: 'aud-sym-pastdue', name: `${due.entity} past due`, kind: 'Rule', rule: { blocks: [{ quantifier: 'any', entity: due.entity, codeCategory: cat(due.entity), types: [], conditions: [{ id: 1, field: due.field, op: 'past_n', value: '', n: 0 }, { id: 2, field: bal.field, op: 'gt', value: '0', n: 3 }] }] }, usedIn: 0 },
    due && { id: 'aud-sym-due30', name: `${due.label} — next 30 days`, kind: 'Rule', rule: { blocks: [{ quantifier: 'any', entity: due.entity, codeCategory: cat(due.entity), types: [], conditions: [{ id: 1, field: due.field, op: 'next_n', value: '', n: 30 }] }] }, usedIn: 0 },
    { id: 'aud-sym-nomaturity', name: 'No Maturity Date on file', kind: 'Rule', rule: { blocks: [{ quantifier: 'any', entity: 'Loans', codeCategory: cat('Loans'), types: [], conditions: [{ id: 1, field: 'Maturity Date', op: 'not_set', value: '', n: 3 }] }] }, usedIn: 0 },
    firstEntity && { id: 'aud-sym-multi', name: `Members with 2+ ${firstEntity}`, kind: 'Rule', rule: { blocks: [{ quantifier: 'two_plus', entity: firstEntity, codeCategory: cat(firstEntity), types: [], conditions: [] }] }, usedIn: 0 },
    xsell && { id: 'aud-sym-crosssell', name: 'Borrowers without a card', kind: 'Rule', rule: { blocks: xsell }, usedIn: 0 },
    DEMO_RULE && { id: 'aud-due-soon', name: `${due?.label ?? 'Anchor'} — next 3 days`, kind: 'Rule', rule: structuredClone(DEMO_RULE), usedIn: 0 },
  ].filter(Boolean)
}

/* Ready-to-launch playbooks are GENERATED from mapped semantic roles —
   a playbook exists only when the data carries the meaning it needs.
   The library explains what unlocks the rest. */
export const audienceTemplates = () => {
  const due = roleField('recurring_date')
  const out = []
  if (due && DEMO_RULE) {
    out.push({
      id: 'tpl-anchor-reminder',
      title: `${due.label} reminders`,
      blurb: `Every member with any ${due.entity} record whose ${due.label} is in the next 3 days — one reminder per qualifying record.`,
      kind: 'Rule',
      rule: structuredClone(DEMO_RULE),
    })
  }
  const xsell = crossSellBlocks()
  if (xsell) {
    out.push({
      id: 'tpl-cross-sell-card',
      title: 'Cross-sell: card to borrowers',
      blurb: `Members holding any ${xsell[0].entity} record in Loans and none in Cards — each qualifying record enrolls; the card filter just gates who.`,
      kind: 'Rule',
      rule: { blocks: xsell },
    })
  }
  return out
}

/* Anchor-able date fields for the journey's date trigger: every date
   field of every segmentable entity, addressed as entity·field. */
export const registryDateFields = () =>
  segmentEntities().flatMap((e) =>
    e.fields.filter((f) => f.type === 'date').map((f) => ({
      key: `${e.name}·${f.name}`,
      label: `${f.label} (${e.name})`,
    }))
  )

/* Personalization tokens: one per campaign-usable entity field, plus the
   member's name. Sample values come from a REAL record (the showcase
   member) so the preview shows what the data actually contains. */
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
export const messageTokens = () => {
  const out = [{ token: '{{first_name}}', sample: 'Amara' }]
  const sm = showcaseMember()
  for (const def of REGISTRY) {
    if (def.purpose === 'segment') continue // campaign or both only
    const rec = MEMBERS.flatMap((m) => m.records[def.name] ?? [])[0]
    for (const f of def.fields) {
      if (f.role === 'code') {
        out.push({ token: `{{${slug(def.name)}.type}}`, sample: rec ? recordTypeLabel(def.name, rec) : '—' })
        continue
      }
      const v = rec?.values[f.name]
      const sample = v === undefined ? '—'
        : f.type === 'currency' ? `$${fmt(v)}`
        : f.type === 'date' ? (v < 0 ? `${-v}d ago` : `in ${v} days`)
        : String(v)
      out.push({ token: `{{${slug(def.name)}.${slug(f.label)}}}`, sample })
    }
  }
  return sm ? out : out.slice(0, 1)
}

/* ── sources: the ingestion layer. One real source — the ingested VIP
   extract. Its card is built from actual ingest facts; connecting more
   sources is the empty state, not fake rows. */
export const seedSources = () => [symitarSource()]

export function symitarSource(meta = null) {
  const s = SYMITAR_STATS
  return {
    id: 'src-symitar',
    name: 'Symitar core extract',
    type: 'core',
    cadence: meta?.lastIngestedAt
      ? `File drop · ingested ${new Date(meta.lastIngestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : `File drop · ${s.fileDate}`,
    records: `${fmt(s.accounts)} members · ${fmt(s.loans)} loans`,
    identity: 'Account number — stored as a salted hash',
    fields: 9,
    status: 'healthy',
    // platform entities are not fed by this source — claiming so would lie
    feeds: REGISTRY.filter((e) => !e.platform).map((e) => e.name).join(' · ') || 'Pending first ingest',
    note: `${Math.round((100 * s.duePast) / s.loans)}% of due dates are in the past — the extract may be stale`,
  }
}

export const SOURCE_TYPE_META = {
  core: { label: 'Core banking', fg: '#1f4a86', bg: '#e6effb' },
  crm: { label: 'CRM', fg: '#c05a8a', bg: '#fbe8f1' },
  sdk: { label: 'SDK', fg: '#1f6f4a', bg: '#e2f4ea' },
  file: { label: 'File', fg: '#8a6d2e', bg: '#fbf1dc' },
  insights: { label: 'Insights', fg: '#7a4fc0', bg: '#efe8fb' },
}

export const SOURCE_GALLERY = ['Fiserv DNA', 'Corelation KeyStone', 'Banno', 'Q2', 'Salesforce', 'Snowflake']

/* One source connected → identity resolution has nothing to join yet.
   The identity card renders this as an explicit state, not fake rates. */
export const IDENTITY_SUMMARY = {
  canonical: 'Account number — from the core extract, stored as a salted hash',
  joins: [],
  unresolved: 0,
}

/* Real Loan Type codes from the ingested extract, with real record
   counts. Labels are placeholders a CU would set (each defines its own
   code meanings) — the five rare codes ship unlabeled as the demo task.
   Category is optional semantic metadata; it gates nothing in the UI. */
const TC = SYMITAR_STATS.typeCounts
export const seedSymitarCodes = () => [
  { code: '0010', rawCols: 'Loan Type · VIP.LOAN', label: 'Auto Loan', category: 'loan', holders: TC['0010'] ?? 0 },
  { code: '0011', rawCols: 'Loan Type · VIP.LOAN', label: 'Used Auto Loan', category: 'loan', holders: TC['0011'] ?? 0 },
  { code: '0040', rawCols: 'Loan Type · VIP.LOAN', label: 'Personal Loan', category: 'loan', holders: TC['0040'] ?? 0 },
  { code: '0000', rawCols: 'Loan Type · VIP.LOAN', label: 'Signature Loan', category: 'loan', holders: TC['0000'] ?? 0 },
  { code: '0001', rawCols: 'Loan Type · VIP.LOAN', label: 'Share Secured Loan', category: 'loan', holders: TC['0001'] ?? 0 },
  { code: '0030', rawCols: 'Loan Type · VIP.LOAN', label: 'Home Equity', category: 'loan', holders: TC['0030'] ?? 0 },
  { code: '0031', rawCols: 'Loan Type · VIP.LOAN', label: 'Home Equity — 2nd', category: 'loan', holders: TC['0031'] ?? 0 },
  { code: '0032', rawCols: 'Loan Type · VIP.LOAN', label: 'HELOC', category: 'loan', holders: TC['0032'] ?? 0 },
  { code: '0052', rawCols: 'Loan Type · VIP.LOAN', label: 'Student Loan', category: 'loan', holders: TC['0052'] ?? 0 },
  { code: '0090', rawCols: 'Loan Type · VIP.LOAN', label: 'Visa Classic', category: 'card', holders: TC['0090'] ?? 0 },
  { code: '0091', rawCols: 'Loan Type · VIP.LOAN', label: 'Visa Gold', category: 'card', holders: TC['0091'] ?? 0 },
  { code: '0092', rawCols: 'Loan Type · VIP.LOAN', label: 'Visa Platinum', category: 'card', holders: TC['0092'] ?? 0 },
  { code: '0093', rawCols: 'Loan Type · VIP.LOAN', label: 'Visa Rewards', category: 'card', holders: TC['0093'] ?? 0 },
  { code: '0094', rawCols: 'Loan Type · VIP.LOAN', label: 'Business Visa', category: 'card', holders: TC['0094'] ?? 0 },
  { code: '0005', rawCols: 'Loan Type · VIP.LOAN', label: '', category: null, holders: TC['0005'] ?? 0 },
  { code: '0009', rawCols: 'Loan Type · VIP.LOAN', label: '', category: null, holders: TC['0009'] ?? 0 },
  { code: '0020', rawCols: 'Loan Type · VIP.LOAN', label: '', category: null, holders: TC['0020'] ?? 0 },
  { code: '0089', rawCols: 'Loan Type · VIP.LOAN', label: '', category: null, holders: TC['0089'] ?? 0 },
  { code: '0420', rawCols: 'Loan Type · VIP.LOAN', label: '', category: null, holders: TC['0420'] ?? 0 },
]

/* A code is mapped when it has a label — that's the whole job. Category
   is optional semantic metadata. */
export const codeMapped = (c) => !!c.label.trim()

/* Real ingest history: exactly one file drop has happened. Hydrated
   with ingest metadata when the SQLite API is live. */
export let INGEST_META = null
export const setIngestMeta = (m) => { INGEST_META = m }
export const feedFiles = () => {
  const s = SYMITAR_STATS
  return [
    { file: INGEST_META?.loanFile ?? `${s.fileDate.slice(5).replace('-', '')}${s.fileDate.slice(2, 4)}.VIP.LOAN`, when: `File date ${s.fileDate}`, rows: s.loans, status: 'ok', note: `${Object.keys(s.typeCounts).length} loan type codes discovered` },
    { file: INGEST_META?.nameFile ?? `${s.fileDate.slice(5).replace('-', '')}${s.fileDate.slice(2, 4)}.VIP.NAME`, when: `File date ${s.fileDate}`, rows: s.accounts, status: 'ok', note: null },
  ]
}

/* Real blank-date gap, computed from the extract — never an estimate.
   The field it concerns is whichever one carries the recurring_date
   role; without that role mapped there is no gap check to run. */
export const dueDateGap = () => {
  const s = SYMITAR_STATS
  const rf = roleField('recurring_date')
  if (!rf) return { field: null, missingPct: 0, count: 0 }
  return { field: rf.label, entity: rf.entity, missingPct: Math.round((100 * s.dueUnset) / s.loans), count: s.dueUnset }
}

export const gapAudienceRule = () => {
  const rf = roleField('recurring_date')
  if (!rf) return null
  return { blocks: [{ quantifier: 'any', entity: rf.entity, codeCategory: scopeCategoryFor(rf.entity), types: [], conditions: [{ id: 1, field: rf.field, op: 'not_set', value: '', n: 3 }] }] }
}

/* Display identities for real matched members: deterministic synthetic
   names keyed on the stable extract id (real names never leave the
   source files). Used ONLY for members that actually exist in the data. */
const FIRST = ['Amara', 'Diego', 'Priya', 'Liam', 'Noor', 'Kenji', 'Sofia', 'Marcus', 'Yuki', 'Elena', 'Omar', 'Grace', 'Tomas', 'Aisha', 'Ravi', 'Chloe']
const LAST = ['Okafor', 'Reyes', 'Sharma', 'Walsh', 'Haddad', 'Tanaka', 'Rossi', 'Bennett', 'Ito', 'Novak', 'Farah', 'Kim', 'Silva', 'Ali', 'Patel', 'Dubois']

/* The real member with the most instance records — used by the "how it
   works" explainer so even the illustration is actual extract data. */
export const showcaseMember = () => {
  const instanceEntities = segmentEntities().map((e) => e.name)
  const withCount = MEMBERS.map((m) => ({
    m,
    n: instanceEntities.reduce((s, e) => s + (m.records[e]?.length ?? 0), 0),
  })).sort((a, b) => b.n - a.n)[0]
  if (!withCount || !withCount.n) return null
  const m = withCount.m
  const h = hash(m.id)
  const f = FIRST[h % FIRST.length]
  const l = LAST[(h >>> 3) % LAST.length]
  return {
    id: m.id,
    name: `${f} ${l}`,
    initials: f[0] + l[0],
    products: instanceEntities.flatMap((e) =>
      (m.records[e] ?? []).map((r) => ({
        code: entityDef(e)?.codeField ? r.values[entityDef(e).codeField] : e,
        label: recordTypeLabel(e, r),
        facts: recordFactline(e, r),
      }))
    ),
  }
}

/* ── Legacy migration map ────────────────────────────────────────────
   Observed from the production (staging) segment builder, August 2026
   screenshots. This is a mapping PLAN — nothing here is ingested data.
   Every condition source in today's builder is either a real entity the
   kernel absorbs, a campaign-shaped file drop to archive (its underlying
   data has a proper home), or platform machinery. */
export const LEGACY_MIGRATION = [
  { legacyName: 'All Users', cleanName: 'Everyone', category: 'member', disposition: 'platform',
    note: 'The baseline segment, not an entity.', exampleFields: [] },
  { legacyName: 'Personal', cleanName: 'Member Profile', category: 'member', purpose: 'both', disposition: 'migrate',
    exampleFields: [
      { raw: 'Alias', label: 'Alias', type: 'string' },
      { raw: 'Email', label: 'Email', type: 'string' },
      { raw: 'Age', label: 'Age', type: 'number', note: 'staging offers "is less than __ minutes ago" — a number treated as a timestamp' },
    ] },
  { legacyName: 'Activity', cleanName: 'App Activity', category: 'behavior', disposition: 'platform',
    note: 'Session/open stream from the SDK — not a file-drop entity.', exampleFields: [] },
  { legacyName: 'Events', cleanName: 'App Events', category: 'behavior', disposition: 'platform',
    note: 'Maps to the reserved App Events entity. "Number Of Event Occurrences = N" needs a count quantifier (phase 3).',
    exampleFields: [
      { raw: 'Last In App Event', label: 'Event Name + Occurred At', type: 'string + date' },
      { raw: 'Event Recorded', label: 'Has any App Events', type: 'quantifier' },
    ] },
  { legacyName: 'Cunexus', cleanName: 'CuNexus Offers', category: 'offer', purpose: 'segment', disposition: 'migrate',
    note: 'Pre-approval offers become records — one per offer instance, expirations as typed dates.', exampleFields: [] },
  { legacyName: 'Device Settings', cleanName: 'Device & Push Settings', category: 'member', disposition: 'platform',
    note: 'Push permission and device attributes — SDK-owned.', exampleFields: [] },
  { legacyName: 'Location Events', cleanName: 'Location Events', category: 'behavior', disposition: 'platform',
    note: 'Geofence enter/exit stream.', exampleFields: [] },
  { legacyName: 'Auto Loan', cleanName: 'Loans', category: 'loan', purpose: 'both', disposition: 'migrate',
    note: 'Folds into the Loans entity as records with an auto-typed code — not its own entity.', exampleFields: [] },
  { legacyName: 'Auto Loan Renewal', cleanName: null, category: 'loan', disposition: 'campaign-artifact',
    note: 'Campaign targeting extract. Underlying data = Loans · Maturity Date.', exampleFields: [] },
  { legacyName: 'Credit Card Activation Usage', cleanName: 'Cards', category: 'card', purpose: 'both', disposition: 'migrate',
    note: 'Activation and usage become typed fields on card records.', exampleFields: [] },
  { legacyName: 'H ELOC Offer', cleanName: null, category: 'offer', disposition: 'campaign-artifact',
    note: 'One-campaign file drop — each column has a proper home.',
    exampleFields: [
      { raw: 'HELOC Offer->Member_Age', label: 'Age', type: 'number', note: 'belongs on Member Profile, not on an offer' },
      { raw: 'HELOC Offer->Loan_Type', label: 'Loan Type', type: 'string', role: 'code', note: 'belongs on Loans' },
      { raw: 'HELOC Offer->Loan_Balance', label: 'Loan Balance', type: 'currency', note: 'belongs on Loans' },
    ] },
  { legacyName: 'Personal Loan Promotion', cleanName: null, category: 'offer', disposition: 'campaign-artifact',
    note: 'One-campaign file drop; data = Loans + offer records.', exampleFields: [] },
  { legacyName: 'C D Offer CD Renewal', cleanName: 'Certificates', category: 'certificate', purpose: 'both', disposition: 'migrate',
    note: 'Name mangled by auto-splitting ("C D Offer CD Renewal"). Maturity/renewal become date fields with calendar operators.', exampleFields: [] },
  { legacyName: 'Debit Card Activation Usage', cleanName: 'Debit Cards', category: 'card', purpose: 'both', disposition: 'migrate',
    exampleFields: [
      { raw: 'Debit Card Activation & Usage->Activation_Date', label: 'Activation Date', type: 'date', note: 'staging offers relative-time operators only — no calendar dates, no between, no is-set' },
    ] },
  { legacyName: 'E Statement Enrollment', cleanName: 'Member Profile · eStatement', category: 'member', purpose: 'segment', disposition: 'migrate',
    exampleFields: [
      { raw: 'eStatement Enrollment->eStatement_Enrollment', label: 'eStatement enrolled', type: 'bool', note: 'typed bool distinguishes false from never-set' },
    ] },
  { legacyName: 'Direct Deposit', cleanName: 'Direct Deposits', category: 'deposit', purpose: 'both', disposition: 'migrate',
    exampleFields: [
      { raw: 'Direct Deposit->Direct_Deposit_Status', label: 'Status', type: 'bool', note: 'bool/string ambiguity in staging' },
      { raw: 'Direct Deposit->Deposit_Amount', label: 'Deposit Amount', type: 'currency' },
      { raw: 'Direct Deposit->Deposit_Frequency', label: 'Frequency', type: 'string', role: 'code' },
      { raw: 'Direct Deposit->Employment_Status', label: 'Employment Status', type: 'string', note: 'belongs on Member Profile, not on deposits' },
    ] },
  { legacyName: 'Loan Payment Reminder', cleanName: null, category: 'loan', disposition: 'campaign-artifact',
    note: 'Exactly this prototype’s Due Date playbook — data = Loans · Due Date with the recurring_date role.', exampleFields: [] },
  { legacyName: 'Birthday Anniversary', cleanName: null, category: 'member', disposition: 'campaign-artifact',
    note: 'Birthday becomes a recurring_date field on Member Profile; the campaign is a date-anchor playbook.', exampleFields: [] },
  { legacyName: 'Dormant Account Win Back', cleanName: null, category: 'deposit', disposition: 'campaign-artifact',
    note: 'Campaign extract spanning four homes.',
    exampleFields: [
      { raw: 'Dormant Account / Win-Back->Last_Transaction_Date', label: 'Last Transaction Date', type: 'date', note: 'belongs on Accounts; staging offers "equal to __ years ago" only' },
      { raw: 'Dormant Account / Win-Back->Account_Balance', label: 'Account Balance', type: 'currency' },
      { raw: 'Dormant Account / Win-Back->Card_Usage_Status', label: 'Card Usage Status', type: 'string', note: 'belongs on Cards' },
      { raw: 'Dormant Account / Win-Back->Join_Date', label: 'Join Date', type: 'date', note: 'belongs on Member Profile' },
    ] },
  { legacyName: 'Custom Data', cleanName: null, category: 'UNKNOWN', disposition: 'platform',
    note: 'The escape hatch the kernel dissolves — every entity IS custom data, typed and labeled.', exampleFields: [] },
]
