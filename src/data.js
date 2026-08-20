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
      { name: 'Loan Type', label: 'Product code', type: 'string', role: 'code' },
      { name: 'Loan Balance', label: 'Balance', type: 'currency', role: 'balance' },
      { name: 'Payment', label: 'Payment amount', type: 'currency', role: null },
      { name: 'Interest Rate', label: 'Interest rate', type: 'number', role: null },
      { name: 'Due Date', label: 'Due Date', type: 'date', role: 'recurring_date' },
      { name: 'Maturity Date', label: 'Maturity Date', type: 'date', role: null },
    ],
  },
  {
    name: 'Member Contact', category: 'member', purpose: 'campaign', codeField: null,
    fields: [
      { name: 'Has Email', label: 'Has email on file', type: 'bool', role: null },
      { name: 'Has Mobile', label: 'Has mobile on file', type: 'bool', role: null },
    ],
  },
]

const buildFallback = () => {
  REGISTRY = FALLBACK_REGISTRY
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
    REGISTRY = registry
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

/* Rule: quantifier over one entity's records. types are RAW code values
   of the entity's code field (labels can change; codes are stable). */
export const EMPTY_RULE = { quantifier: 'any', entity: null, types: [], conditions: [], recurring: false }

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
export const entityTypes = (entityName) => {
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
  const op = operatorsFor(f.type).find((o) => o.key === c.op)
  const v = f.type === 'currency'
    ? `$${fmt(Number(c.value) || 0)}`
    : `${Number(c.value) || 0}${/rate|apy/i.test(f.label) ? '%' : ''}`
  return `${name} ${op?.label ?? c.op} ${v}`
}

export const rulePlural = (rule) => `${rule.entity ?? 'record'} records`

export function ruleSentence(rule) {
  if (!ruleActive(rule)) return null
  const plural = rule.quantifier === 'two_plus'
  const lead = rule.quantifier === 'any' ? 'Any' : rule.quantifier === 'none' ? 'No' : '2 or more'
  let scope = `${rule.entity} record${plural ? 's' : ''}`
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
  if (rule.types.length) {
    const code = def.codeField ? rec.values[def.codeField] : null
    if (!rule.types.includes(code)) return false
  }
  return conditionsMatch(def, rec, rule)
}

export const memberSatisfies = (matchCount, quantifier) =>
  quantifier === 'none' ? matchCount === 0 : quantifier === 'two_plus' ? matchCount >= 2 : matchCount >= 1

const ruleInstances = (member, rule) => {
  const def = entityDef(rule.entity)
  if (!def) return []
  return (member.records[rule.entity] ?? []).filter((r) => recordMatches(def, r, rule))
}

export function realReach(rule) {
  if (!ruleActive(rule)) return null
  let members = 0
  let records = 0
  for (const m of MEMBERS) {
    const matches = ruleInstances(m, rule)
    if (memberSatisfies(matches.length, rule.quantifier)) members++
    records += matches.length
  }
  return {
    members,
    products: rule.quantifier === 'none' ? null : records,
    source: 'extract',
    unlabeled: unlabeledRecordCount(rule.entity),
  }
}

/* Human factline for any record: its type label plus the most salient
   currency and date facts, using the entity's own field labels. */
export function recordFactline(entityName, rec) {
  const def = entityDef(entityName)
  if (!def) return ''
  const parts = []
  const cur = def.fields.find((f) => f.role === 'balance') ?? def.fields.find((f) => f.type === 'currency')
  if (cur && rec.values[cur.name] != null) parts.push(`$${fmt(rec.values[cur.name])}`)
  const dt = def.fields.find((f) => f.role === 'recurring_date') ?? def.fields.find((f) => f.type === 'date')
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
  return parts.join(' · ')
}

export const recordTypeLabel = (entityName, rec) => {
  const def = entityDef(entityName)
  const code = def?.codeField ? rec.values[def.codeField] : null
  return code != null ? codeLabel(code) : entityName
}

/* Real matched members for drill-ins: sequential extract IDs with
   deterministic synthetic display names (real names never leave the
   source files). Multi-match members sort first. */
export function datasetMatchedMembers(rule, limit = 8) {
  const out = []
  for (const m of MEMBERS) {
    const matches = ruleInstances(m, rule).map((r) => ({
      label: recordTypeLabel(rule.entity, r),
      fact: recordFactline(rule.entity, r),
    }))
    if (!memberSatisfies(matches.length, rule.quantifier)) continue
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

/* Reach for an audience object — always the live evaluation. */
export function audienceReach(a) {
  if (a.rule) return realReach(a.rule)
  return { members: a.users ?? 0, products: null }
}

/* Deterministic "AI" phrase parser — keyword matching, no model calls.
   Entity detection runs against the LIVE registry names and the FI's
   live code labels; nothing is hardcoded. */
export function parseAudiencePhrase(text) {
  const t = (text || '').toLowerCase()
  if (!t.trim()) return null

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
  const dateField = (kw) => def.fields.find((f) => f.type === 'date' && f.label.toLowerCase().includes(kw))
  const currencyField = () => def.fields.find((f) => f.role === 'balance') ?? def.fields.find((f) => f.type === 'currency')

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

  return { quantifier, entity, types, conditions, recurring: false }
}

/* Performance metrics come only from observed delivery/engagement
   events. No messages have been sent from this prototype, so there is
   no performance data — the view says so instead of simulating it. */

/* ── audiences as first-class objects ────────────────────────────── */

export const DEMO_RULE = {
  quantifier: 'any', entity: 'Loans', types: [],
  conditions: [{ id: 1, field: 'Due Date', op: 'next_n', value: '', n: 3 }],
}

const loansRule = (conditions, quantifier = 'any') => ({ quantifier, entity: 'Loans', types: [], conditions })

/* Every seeded audience is rule-backed and evaluates live against the
   ingested data — no invented audiences with invented sizes. */
export const seedAudiences = () => [
  { id: 'aud-sym-pastdue', name: 'Loans past due', kind: 'Rule', rule: loansRule([{ id: 1, field: 'Due Date', op: 'past_n', value: '', n: 0 }, { id: 2, field: 'Loan Balance', op: 'gt', value: '0', n: 3 }]), baseIds: [], usedIn: 0 },
  { id: 'aud-sym-due30', name: 'Payment due — next 30 days', kind: 'Rule', rule: loansRule([{ id: 1, field: 'Due Date', op: 'next_n', value: '', n: 30 }]), baseIds: [], usedIn: 0 },
  { id: 'aud-sym-nomaturity', name: 'No maturity date on file', kind: 'Rule', rule: loansRule([{ id: 1, field: 'Maturity Date', op: 'not_set', value: '', n: 3 }]), baseIds: [], usedIn: 0 },
  { id: 'aud-sym-multiloan', name: 'Members with 2+ loans', kind: 'Rule', rule: loansRule([], 'two_plus'), baseIds: [], usedIn: 0 },
  { id: 'aud-loans-due-soon', name: 'Loans due soon', kind: 'Rule', rule: { ...DEMO_RULE }, baseIds: [], usedIn: 0 },
]

/* Ready-to-launch audiences: only playbooks whose rule can actually
   evaluate against ingested data. More appear as more entities arrive —
   the library says so instead of listing predictive placeholders. */
export const AUDIENCE_TEMPLATES = [
  {
    id: 'tpl-loan-reminder',
    title: 'Loan payment reminders',
    blurb: 'Every member with any Loans record due in the next 3 days — one reminder per qualifying record.',
    kind: 'Rule',
    rule: { ...DEMO_RULE },
  },
]

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
    feeds: REGISTRY.map((e) => e.name).join(' · ') || 'Pending first ingest',
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

/* Real blank-date gap, computed from the extract — never an estimate. */
export const dueDateGap = () => {
  const s = SYMITAR_STATS
  return { field: 'Due Date', missingPct: Math.round((100 * s.dueUnset) / s.loans), count: s.dueUnset }
}

export const GAP_AUDIENCE_RULE = {
  quantifier: 'any', entity: 'Loans', types: [],
  conditions: [{ id: 1, field: 'Due Date', op: 'not_set', value: '', n: 3 }],
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
