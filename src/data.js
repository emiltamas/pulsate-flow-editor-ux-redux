import { SYMITAR_STATS, SYMITAR_ACCOUNTS } from './symitarDataset.js'
export { SYMITAR_STATS }

/* When the SQLite-backed API is live (db/pulsate.db ingested), the app
   replaces the bundled dataset in place with the one reconstructed from
   ENTITY_DEF → RECORD → VALUE rows. Same shape, same evaluation code —
   the caller re-renders after hydration. */
export function hydrateDataset({ accounts, stats }) {
  SYMITAR_ACCOUNTS.length = 0
  SYMITAR_ACCOUNTS.push(...accounts)
  for (const k of Object.keys(SYMITAR_STATS)) delete SYMITAR_STATS[k]
  Object.assign(SYMITAR_STATS, stats)
}

export const SEGMENTS = [
  { name: 'Active — last 30 days', group: 'Smart', users: 184230 },
  { name: 'New signups this week', group: 'Smart', users: 6842 },
  { name: 'Completed onboarding', group: 'Smart', users: 52107 },
  { name: 'Premium subscribers', group: 'Smart', users: 14903 },
  { name: 'Lapsed 60+ days', group: 'Smart', users: 31288 },
  { name: 'Push opt-in', group: 'System', users: 98450 },
  { name: 'Email subscribers', group: 'System', users: 203115 },
  { name: 'iOS users', group: 'System', users: 76220 },
  { name: 'Black Friday 2025 waitlist', group: 'Uploaded', users: 12004 },
  { name: 'VIP customers — Q2', group: 'Uploaded', users: 842 },
  { name: 'Winback CSV — March', group: 'Uploaded', users: 5310 },
  { name: 'Beta testers', group: 'Manual', users: 126 },
  { name: 'Likely to accept a loan offer', group: 'Predicted', users: 3120 },
  { name: 'Churn risk — next 90 days', group: 'Predicted', users: 1480 },
  { name: 'Card upgrade propensity', group: 'Predicted', users: 2210 },
]

export const GEOFENCES = [
  { name: 'Downtown Flagship Store', group: 'Branch' },
  { name: 'Westfield Century City', group: 'Branch' },
  { name: 'Manhattan Beach Store', group: 'Branch' },
  { name: 'Bay Area Dealer Network', group: 'Dealer' },
  { name: 'Texas Dealer Network', group: 'Dealer' },
  { name: 'Southern California Region', group: 'Region' },
  { name: 'Pacific Northwest Region', group: 'Region' },
  { name: 'Summer Festival Pop-up', group: 'Custom' },
  { name: 'Campus Push Zone', group: 'Push' },
]

export const SEG_GROUPS = ['Smart', 'Uploaded', 'Manual', 'System', 'Predicted']
export const GEO_GROUPS = ['Custom', 'Push', 'Branch', 'Dealer', 'Region']

export const TOTAL_SEGMENTS = 478
export const TOTAL_GEOFENCES = 79
export const REACH_CEILING = 205004

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

/* ── multi-product model ─────────────────────────────────────────────
   Members hold products. Marketers target on product facts through one
   rule: quantifier + category scope (optionally narrowed to FI labels)
   + conditions that must all match the SAME product instance. */

export const TOTAL_MEMBERS = 18400

export const PRODUCT_CATEGORIES = {
  loan: {
    label: 'Loan', plural: 'loans',
    types: ['Auto Loan', 'Personal Loan', 'Home Equity', 'Student Loan'],
    fields: [
      { key: 'balance', label: 'Balance', type: 'currency' },
      { key: 'payment', label: 'Monthly payment', type: 'currency' },
      { key: 'dueDate', label: 'Payment due date', type: 'date' },
      { key: 'maturity', label: 'Maturity date', type: 'date' },
      { key: 'rate', label: 'Interest rate', type: 'number' },
      { key: 'drift', label: 'Payment drift (days)', type: 'number' },
    ],
  },
  deposit: {
    label: 'Deposit', plural: 'deposits',
    types: ['Share Savings', 'Holiday Club', 'Money Market'],
    fields: [{ key: 'balance', label: 'Balance', type: 'currency' }],
  },
  certificate: {
    label: 'Certificate', plural: 'certificates',
    types: ['6-Month Certificate', '12-Month Certificate', '5-Year Jumbo'],
    fields: [
      { key: 'balance', label: 'Balance', type: 'currency' },
      { key: 'maturity', label: 'Maturity date', type: 'date' },
      { key: 'apy', label: 'APY', type: 'number' },
    ],
  },
  card: {
    label: 'Card', plural: 'cards',
    types: ['Visa Platinum', 'Visa Rewards', 'Secured Card'],
    fields: [
      { key: 'balance', label: 'Balance', type: 'currency' },
      { key: 'payment', label: 'Minimum payment', type: 'currency' },
      { key: 'dueDate', label: 'Payment due date', type: 'date' },
    ],
  },
}
export const CATEGORY_ORDER = ['loan', 'deposit', 'certificate', 'card']

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
}

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

export const EMPTY_PRODUCT_RULE = { quantifier: 'any', entity: 'product', category: null, types: [], conditions: [], recurring: false }

/* ── Offers: the registry's second instance entity. One curated field
   set; offer TYPES are the scope vocabulary, labeled per vendor code
   through the catalog (same pattern as product codes). */
export const OFFER_FIELDS = [
  { key: 'amount', label: 'Approved amount', type: 'currency' },
  { key: 'offerRate', label: 'Offer rate', type: 'number' },
  { key: 'expires', label: 'Expiration date', type: 'date' },
]

export const seedOfferCodes = () => [
  { code: 'CNX-AUTO', source: 'Prequal engine', label: 'Auto loan pre-approval', offers: 41 },
  { code: 'CNX-PL', source: 'Prequal engine', label: 'Personal loan pre-approval', offers: 28 },
  { code: 'CNX-HE', source: 'Prequal engine', label: 'HELOC pre-approval', offers: 19 },
  { code: 'CNX-RV22', source: 'Prequal engine', label: '', offers: 8 },
]

let activeOfferMap = new Map()
export const setActiveOfferMap = (codes) => {
  activeOfferMap = new Map(codes.map((c) => [c.code, c]))
}
export const offerTypeLabels = () =>
  [...activeOfferMap.values()].filter((c) => c.label.trim()).map((c) => c.label)

/* Deterministic synthetic offers riding on the real member dataset
   (~40% of members hold 1–2). Real extract carries no offer data. */
const OFFER_CODE_KEYS = ['CNX-AUTO', 'CNX-PL', 'CNX-HE', 'CNX-AUTO', 'CNX-PL', 'CNX-RV22']
export function memberOffers(accountId) {
  const h = hash('offers·' + accountId)
  if (h % 5 >= 2) return [] // ~40% of members hold offers
  const count = 1 + (h % 2)
  const out = []
  for (let k = 0; k < count; k++) {
    // Knuth multiplicative mix — consecutive k must diverge in high bits too
    const hk = Math.imul(hash(accountId + '·' + k), 2654435761) >>> 0
    out.push({
      code: OFFER_CODE_KEYS[(hk >>> 2) % OFFER_CODE_KEYS.length],
      amount: 2500 + ((hk >>> 4) % 24) * 2500,
      offerRate: 5 + ((hk >>> 6) % 60) / 10,
      // cluster: ~1/3 expiring within 14 days, some already expired
      expiresInDays: (hk >>> 3) % 3 === 0 ? ((hk >>> 5) % 21) - 6 : 15 + ((hk >>> 5) % 76),
    })
  }
  return out
}

const resolvedOffers = (accountId) =>
  memberOffers(accountId).flatMap((o) => {
    const m = activeOfferMap.get(o.code)
    if (!m || !m.label.trim()) return []
    return [{ ...o, label: m.label }]
  })

export const unmappedOfferCount = () =>
  SYMITAR_ACCOUNTS.reduce((s, a) => s + memberOffers(a.id).filter((o) => {
    const m = activeOfferMap.get(o.code)
    return !(m && m.label.trim())
  }).length, 0)

export const expiringOffersCount = (days = 14) =>
  SYMITAR_ACCOUNTS.reduce((s, a) => s + memberOffers(a.id).filter((o) => o.expiresInDays >= 0 && o.expiresInDays <= days).length, 0)

export function offerFactline(o) {
  const parts = [`up to $${fmt(o.amount)}`, `${o.offerRate.toFixed(1)}%`]
  parts.push(
    o.expiresInDays < 0 ? `expired ${-o.expiresInDays}d ago`
      : o.expiresInDays === 0 ? 'expires today'
      : `expires in ${o.expiresInDays} days`
  )
  return parts.join(' · ')
}

/* N-value with default, treating 0 as a real value ("more than 0 days
   ago" = any past date). */
const nOr = (v, d) => {
  if (v === '' || v == null) return d
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

export const fieldByKey = (category, key) => PRODUCT_CATEGORIES[category].fields.find((f) => f.key === key)
export const operatorsFor = (type) => OPERATORS[type] ?? OPERATORS.number
export const ruleActive = (rule) => !!rule && (rule.entity === 'offer' || !!rule.category)

/* Field set for a rule, per entity class. */
export const fieldsFor = (rule) =>
  rule.entity === 'offer' ? OFFER_FIELDS : rule.category ? PRODUCT_CATEGORIES[rule.category].fields : []

export const rulePlural = (rule) =>
  rule.entity === 'offer' ? 'offers' : PRODUCT_CATEGORIES[rule.category]?.plural ?? 'products'

export function conditionText(rule, c) {
  const f = fieldsFor(rule).find((x) => x.key === c.field)
  if (!f) return ''
  const name = f.label.toLowerCase()
  if (c.op === 'not_set') return `${name} is not set`
  if (c.op === 'is_set') return `${name} is set`
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
    : `${Number(c.value) || 0}${f.key === 'apy' || f.key === 'rate' || f.key === 'offerRate' ? '%' : ''}`
  return `${name} ${op.label} ${v}`
}

export function ruleSentence(rule) {
  if (!ruleActive(rule)) return null
  const plural = rule.quantifier === 'two_plus'
  const scope = rule.entity === 'offer'
    ? (rule.types.length ? rule.types.join(' or ') + (plural ? 's' : '') : plural ? 'offers' : 'offer')
    : (rule.types.length
        ? rule.types.join(' or ') + (plural ? 's' : '')
        : plural ? PRODUCT_CATEGORIES[rule.category].plural : PRODUCT_CATEGORIES[rule.category].label.toLowerCase())
  const lead = rule.quantifier === 'any' ? 'Any' : rule.quantifier === 'none' ? 'No' : '2 or more'
  const conds = rule.conditions.length
    ? ` where ${rule.conditions.map((c) => conditionText(rule, c)).join(' and ')}`
    : ''
  return `${lead} ${scope}${conds}`
}

/* Mocked audience math — deterministic per rule so numbers feel stable. */
export function productReach(rule, baseMembers) {
  if (!ruleActive(rule)) return null
  const h = hash(JSON.stringify([rule.quantifier, rule.category, [...rule.types].sort(), rule.conditions.map((c) => [c.field, c.op, c.value, c.value2, c.n])]))
  const catShare = { loan: 0.34, deposit: 0.62, certificate: 0.18, card: 0.41 }[rule.category]
  let f = catShare
  if (rule.types.length) {
    f *= Math.min(1, rule.types.length / PRODUCT_CATEGORIES[rule.category].types.length + 0.08)
  }
  rule.conditions.forEach((_, i) => { f *= 0.18 + ((h >>> (i * 4)) % 16) / 60 })
  if (rule.quantifier === 'two_plus') f *= 0.22
  if (rule.quantifier === 'none') f = 1 - f
  const members = Math.max(24, Math.round(baseMembers * f))
  if (rule.quantifier === 'none') return { members, products: null }
  const perMember = rule.quantifier === 'two_plus' ? 2.05 + ((h >>> 8) % 8) / 40 : 1.18 + ((h >>> 6) % 12) / 44
  return { members, products: Math.round(members * perMember) }
}

/* Deterministic product holdings per member: 1–5 products, ~3 on average.
   Roughly one in nine members holds two near-due loans, so per-product
   matching and double-enrollment are always demonstrable. */
export function memberProducts(seed) {
  const h = hash(seed)
  const twinLoans = h % 9 === 2
  const count = twinLoans ? 3 : [1, 2, 3, 3, 3, 4, 5][h % 7]
  const out = []
  for (let k = 0; k < count; k++) {
    const category = twinLoans && k < 2 ? 'loan' : CATEGORY_ORDER[(h + k * 3) % 4]
    const cat = PRODUCT_CATEGORIES[category]
    out.push({
      category,
      label: cat.types[(h + k * 5) % cat.types.length],
      balance: 400 + (((h >>> 1) * (k + 3)) % 240) * 100,
      payment: 60 + (((h >>> 3) + k * 17) % 540),
      rate: 3 + (((h >>> 5) + k) % 15),
      apy: 1 + (((h >>> 7) + k) % 5),
      // ~1 in 6 non-twin products has no due date on file — the blank-check
      // gap needs real unset data to be demonstrable
      dueInDays: twinLoans && k < 2
        ? (k === 0 ? 1 : 3)
        : ((((h >>> 6) + k * 7) % 6) === 0 ? null : ((((h >>> 2) + k * 5) % 27) - 6)),
      maturityInDays: (((h >>> 4) + k * 11) % 180),
    })
  }
  return out
}

/* Days-value for a date field on any instance (product or offer). */
const dateValueOf = (inst, key) =>
  key === 'maturity' ? inst.maturityInDays : key === 'expires' ? inst.expiresInDays : inst.dueInDays

const conditionsMatch = (inst, rule) =>
  rule.conditions.every((c) => {
    const f = fieldsFor(rule).find((x) => x.key === c.field)
    if (!f) return false
    if (f.type === 'date') {
      const d = dateValueOf(inst, c.field)
      if (c.op === 'not_set') return d == null
      if (c.op === 'is_set') return d != null
      if (d == null) return false // unset never matches a value comparison
      if (c.op === 'tomorrow') return d === 1
      if (c.op === 'next_n') return d >= 0 && d <= nOr(c.n, 3)
      if (c.op === 'more_than_n_away') return d > nOr(c.n, 30)
      if (c.op === 'before_date') { const t = daysUntil(c.value); return t != null && d <= t }
      if (c.op === 'after_date') { const t = daysUntil(c.value); return t != null && d > t }
      if (c.op === 'between_dates') {
        const t1 = daysUntil(c.value)
        const t2 = daysUntil(c.value2)
        return t1 != null && t2 != null && d >= Math.min(t1, t2) && d <= Math.max(t1, t2)
      }
      return d < -nOr(c.n, 30)
    }
    const pv = inst[c.field]
    if (c.op === 'not_set') return pv == null
    if (c.op === 'is_set') return pv != null
    if (pv == null) return false
    const v = Number(c.value) || 0
    return c.op === 'gt' ? pv > v : pv < v
  })

export function productMatches(product, rule) {
  if (product.category !== rule.category) return false
  if (rule.types.length && !rule.types.includes(product.label)) return false
  return conditionsMatch(product, rule)
}

export function offerMatches(offer, rule) {
  if (rule.types.length && !rule.types.includes(offer.label)) return false
  return conditionsMatch(offer, rule)
}

export const matchedProducts = (seed, rule) => memberProducts(seed).filter((p) => productMatches(p, rule))

export const memberSatisfies = (matchCount, quantifier) =>
  quantifier === 'none' ? matchCount === 0 : quantifier === 'two_plus' ? matchCount >= 2 : matchCount >= 1

/* Deterministic "AI" phrase parser — keyword matching, no model calls.
   Returns a product rule or null when no product type is recognized. */
export function parseAudiencePhrase(text) {
  const t = (text || '').toLowerCase()
  if (!t.trim()) return null

  // offer-shaped phrases → the offers entity (checked before product
  // categories so "pre-approved for $10,000" needs no product word)
  if (/pre-?approved|pre-?qualif|qualifies for|eligible for/.test(t)) {
    const conditions = []
    let oid = 1
    let om
    if ((om = t.match(/(?:more than|over|above) \$?([\d,]+)/))) {
      conditions.push({ id: oid++, field: 'amount', op: 'gt', value: om[1].replace(/,/g, ''), n: 3 })
    }
    if ((om = t.match(/expir\w* (?:in |within )?(?:the )?next (\d+) days?/))) {
      conditions.push({ id: oid++, field: 'expires', op: 'next_n', value: '', n: Number(om[1]) })
    }
    const types = offerTypeLabels().filter((l) => t.includes(l.toLowerCase().replace(' pre-approval', '')))
    const quantifier = /\btwo or more|2 or more|\b2\+|multiple\b/.test(t) ? 'two_plus' : 'any'
    return { quantifier, entity: 'offer', category: null, types, conditions, recurring: false }
  }

  let category = null
  const types = []
  for (const key of CATEGORY_ORDER) {
    for (const label of PRODUCT_CATEGORIES[key].types) {
      if (t.includes(label.toLowerCase())) {
        category = key
        if (!types.includes(label)) types.push(label)
      }
    }
  }
  if (!category) {
    if (/\bloans?\b|\bmortgage\b/.test(t)) category = 'loan'
    else if (/\bcards?\b|\bvisa\b/.test(t)) category = 'card'
    else if (/\bcertificates?\b|\bcds?\b/.test(t)) category = 'certificate'
    else if (/\bdeposits?\b|\bsavings\b|\bchecking\b/.test(t)) category = 'deposit'
  }
  if (!category) return null

  // pull out "no/missing due date" clauses BEFORE quantifier detection, so
  // "loans with no due date on file" doesn't read as "has no loan"
  const blankDue = /(?:with |having )?(?:no|missing|without an?) due date(?: on file| set)?/.test(t)
  const tq = t.replace(/(?:with |having )?(?:no|missing|without an?) due date(?: on file| set)?/g, '')

  let quantifier = 'any'
  if (/\bno\b|\bwithout\b|doesn'?t have|\bnone\b/.test(tq)) quantifier = 'none'
  else if (/two or more|2 or more|\b2\+|more than one|\bmultiple\b/.test(tq)) quantifier = 'two_plus'

  const conditions = []
  let id = 1
  const fields = PRODUCT_CATEGORIES[category].fields
  const hasField = (k) => fields.some((f) => f.key === k)
  let m

  if (hasField('dueDate')) {
    if (blankDue) {
      conditions.push({ id: id++, field: 'dueDate', op: 'not_set', value: '', n: 3 })
    } else if ((m = t.match(/due (?:in |within )?(?:the )?next (\d+) days?/))) {
      conditions.push({ id: id++, field: 'dueDate', op: 'next_n', value: '', n: Number(m[1]) })
    } else if ((m = t.match(/due (?:in )?more than (\d+) days?(?: away| from now)?/))) {
      conditions.push({ id: id++, field: 'dueDate', op: 'more_than_n_away', value: '', n: Number(m[1]) })
    } else if (/due tomorrow/.test(t)) {
      conditions.push({ id: id++, field: 'dueDate', op: 'tomorrow', value: '', n: 3 })
    } else if ((m = t.match(/overdue (?:by )?(?:more than )?(\d+) days?/))) {
      conditions.push({ id: id++, field: 'dueDate', op: 'past_n', value: '', n: Number(m[1]) })
    }
  }
  if (hasField('maturity') && (m = t.match(/matur\w* (?:in |within )?(?:the )?next (\d+) days?/))) {
    conditions.push({ id: id++, field: 'maturity', op: 'next_n', value: '', n: Number(m[1]) })
  }
  if ((m = t.match(/balance (?:of )?(?:over|above|more than|greater than) \$?([\d,]+)/))) {
    conditions.push({ id: id++, field: 'balance', op: 'gt', value: m[1].replace(/,/g, ''), n: 3 })
  } else if ((m = t.match(/balance (?:of )?(?:under|below|less than) \$?([\d,]+)/))) {
    conditions.push({ id: id++, field: 'balance', op: 'lt', value: m[1].replace(/,/g, ''), n: 3 })
  }

  return { quantifier, category, types, conditions, recurring: false }
}

/* Mocked closed-loop numbers, derived from the audience size so the
   performance view always agrees with the reach shown. */
/* Only metrics Pulsate actually observes: delivery + engagement events,
   plus goal counts when (and only when) a goal is defined. No payment or
   revenue claims — Pulsate never sees payments. */
export function mockPerformance(members, goalDefined = false) {
  const delivered = Math.round(members * 0.96)
  const opened = Math.round(delivered * 0.64)
  const clicked = Math.round(opened * 0.47)
  const exited = Math.round(members * 0.18)
  const goalExits = goalDefined ? Math.round(exited * 0.72) : 0
  return {
    entered: members,
    delivered,
    opened,
    clicked,
    goalReached: goalDefined ? Math.round(clicked * 0.62) : null,
    goalExits,
    removed: exited - goalExits,
  }
}

export const fmtMoney = (n) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${fmt(n)}`

/* ── audiences as first-class objects ────────────────────────────── */

export const DEMO_RULE = {
  quantifier: 'any', category: 'loan', types: [],
  conditions: [{ id: 1, field: 'dueDate', op: 'next_n', value: '', n: 3 }],
}

const symRule = (conditions, quantifier = 'any') => ({ quantifier, category: 'loan', types: [], conditions })

/* The first four audiences evaluate live against the 081126 extract. */
export const seedAudiences = () => [
  { id: 'aud-sym-pastdue', name: 'Loans past due', kind: 'Rule', rule: symRule([{ id: 1, field: 'dueDate', op: 'past_n', value: '', n: 0 }, { id: 2, field: 'balance', op: 'gt', value: '0', n: 3 }]), baseIds: [], usedIn: 1 },
  { id: 'aud-sym-due30', name: 'Payment due — next 30 days', kind: 'Rule', rule: symRule([{ id: 1, field: 'dueDate', op: 'next_n', value: '', n: 30 }]), baseIds: [], usedIn: 0 },
  { id: 'aud-sym-nomaturity', name: 'No maturity date on file', kind: 'Rule', rule: symRule([{ id: 1, field: 'maturity', op: 'not_set', value: '', n: 3 }]), baseIds: [], usedIn: 0 },
  { id: 'aud-sym-multiloan', name: 'Members with 2+ loans', kind: 'Rule', rule: symRule([], 'two_plus'), baseIds: [], usedIn: 0 },
  { id: 'aud-off-auto', name: 'Pre-approved — auto loan', kind: 'Rule', rule: { quantifier: 'any', entity: 'offer', category: null, types: ['Auto loan pre-approval'], conditions: [] }, baseIds: [], usedIn: 0 },
  { id: 'aud-off-expiring', name: 'Offers expiring — next 30 days', kind: 'Rule', rule: { quantifier: 'any', entity: 'offer', category: null, types: [], conditions: [{ id: 1, field: 'expires', op: 'next_n', value: '', n: 30 }] }, baseIds: [], usedIn: 0 },
  { id: 'aud-sym-drift', name: 'Loans drifting 10+ days', kind: 'Rule', rule: symRule([{ id: 1, field: 'drift', op: 'gt', value: '10', n: 3 }]), baseIds: [], usedIn: 0 },
  { id: 'aud-loans-due-soon', name: 'Loans due soon', kind: 'Rule', rule: { ...DEMO_RULE }, baseIds: [], usedIn: 2 },
  ...SEGMENTS.map((s, i) => ({ id: `aud-seg-${i}`, name: s.name, kind: s.group, users: s.users, rule: null, baseIds: [], usedIn: (i * 7) % 4 })),
]

/* ── Symitar real-data evaluation ──────────────────────────────────
   Rule audiences evaluate against the derived extract dataset — exact
   counts, not mocked math. Category/label resolution flows through the
   ACTIVE product-code map, so mapping a code in the catalog visibly
   changes audience reach. */

let activeCodeMap = new Map()
export const setActiveCodeMap = (codes) => {
  activeCodeMap = new Map(codes.map((c) => [c.code, c]))
}

const accountProducts = (a) =>
  a.loans.map((l, i) => {
    const m = activeCodeMap.get(l.code)
    const mapped = m && m.label.trim() && m.category
    // synthetic per-loan payment-drift signal (vendor-computed in reality):
    // ~40% of loans drift 3–21 days, deterministic per loan
    const dh = hash('drift·' + a.id + '·' + i)
    return {
      category: mapped ? m.category : null,
      label: mapped ? m.label : `Type ${l.code}`,
      code: l.code,
      balance: l.balance ?? 0,
      payment: l.payment ?? 0,
      rate: l.rate ?? 0,
      apy: 0,
      dueInDays: l.dueInDays,
      maturityInDays: l.maturityInDays,
      drift: dh % 5 < 2 ? 3 + (dh >>> 3) % 19 : 0,
    }
  })

/* FI-label scope chips come from the live catalog mapping, not the
   static registry defaults — the builder shows the CU's own products. */
export const categoryTypes = (category) => {
  const labels = [...activeCodeMap.values()]
    .filter((c) => c.category === category && c.label.trim())
    .sort((a, b) => (b.holders ?? 0) - (a.holders ?? 0))
    .map((c) => c.label)
  return labels.length ? labels : PRODUCT_CATEGORIES[category].types
}

export const unmappedLoanCount = () =>
  SYMITAR_ACCOUNTS.reduce((s, a) => s + a.loans.filter((l) => {
    const m = activeCodeMap.get(l.code)
    return !(m && m.label.trim() && m.category)
  }).length, 0)

const ruleInstances = (a, rule) =>
  rule.entity === 'offer'
    ? resolvedOffers(a.id).filter((o) => offerMatches(o, rule))
    : accountProducts(a).filter((p) => p.category && productMatches(p, rule))

export function realReach(rule) {
  if (!ruleActive(rule)) return null
  let members = 0
  let products = 0
  for (const a of SYMITAR_ACCOUNTS) {
    const matches = ruleInstances(a, rule)
    if (memberSatisfies(matches.length, rule.quantifier)) members++
    products += matches.length
  }
  return {
    members,
    products: rule.quantifier === 'none' ? null : products,
    source: rule.entity === 'offer' ? 'insights' : 'extract',
    unmappable: rule.entity === 'offer' ? unmappedOfferCount() : unmappedLoanCount(),
  }
}

/* Real matched members for drill-ins: sequential extract IDs with
   deterministic synthetic display names (real names never leave the
   source files). Multi-match members sort first. */
export function datasetMatchedMembers(rule, limit = 8) {
  const out = []
  for (const a of SYMITAR_ACCOUNTS) {
    const matches = ruleInstances(a, rule).map((m) =>
      rule.entity === 'offer' ? { ...m, fact: offerFactline(m) } : m
    )
    if (!memberSatisfies(matches.length, rule.quantifier)) continue
    const h = hash(a.id)
    const f = FIRST[h % FIRST.length]
    const l = LAST[(h >>> 3) % LAST.length]
    const [avFg, avBg] = AVATAR_PALETTE[hash(f + l) % AVATAR_PALETTE.length]
    out.push({
      name: `${f} ${l}`,
      email: `member-${a.id.toLowerCase()}@example.com`,
      initials: f[0] + l[0],
      id: '#' + a.id,
      avFg,
      avBg,
      matches,
    })
  }
  return out.sort((x, y) => y.matches.length - x.matches.length).slice(0, limit)
}

/* Reach for an audience object. Rule audiences → exact extract counts;
   synced audiences keep their reported size. (Start-from narrowing is
   not applied to extract evaluation.) */
export function audienceReach(a, all = []) {
  if (a.rule) return realReach(a.rule)
  const base = a.baseIds?.length
    ? Math.min(TOTAL_MEMBERS, a.baseIds.reduce((s, id) => s + (all.find((x) => x.id === id)?.users || 0), 0))
    : TOTAL_MEMBERS
  return { members: a.users ?? base, products: null }
}

/* Ready-to-launch audiences: outcome-named playbooks a marketer can
   activate in one click. Rule-backed ones stay transparent — the rule
   is visible and editable, not a black box. */
export const AUDIENCE_TEMPLATES = [
  {
    id: 'tpl-loan-reminder',
    title: 'Loan payment reminders',
    blurb: 'Every member with any loan payment due in the next 3 days — one reminder per qualifying loan.',
    kind: 'Rule',
    rule: { ...DEMO_RULE },
  },
  {
    id: 'tpl-cert-renewal',
    title: 'Certificate renewal window',
    blurb: 'Certificates maturing in the next 30 days — reach members before the money walks.',
    kind: 'Rule',
    rule: { quantifier: 'any', category: 'certificate', types: [], conditions: [{ id: 1, field: 'maturity', op: 'next_n', value: '', n: 30 }] },
  },
  {
    id: 'tpl-winback-auto',
    title: 'Win back auto loans',
    blurb: 'Members likely paying a competing lender, scored daily from transaction signals.',
    kind: 'Predicted',
    users: 1860,
  },
  {
    id: 'tpl-high-savers',
    title: 'Deposit growth — high savers',
    blurb: 'High-balance members with room to grow deposits, refreshed daily.',
    kind: 'Predicted',
    users: 2540,
  },
  {
    id: 'tpl-churn-save',
    title: 'Churn risk save',
    blurb: 'Members showing early attrition signals in the next 90 days.',
    kind: 'Predicted',
    users: 1480,
  },
]

/* ── sources: the ingestion layer. Pulsate is not a data lake — every
      source maps into the curated registry; store only what activates. */
export const seedSources = () => [
  { id: 'src-symitar', name: 'Symitar core feed', type: 'core', cadence: 'SFTP · nightly 04:12', records: '18,400 members', identity: 'Member number', fields: 26, status: 'healthy', feeds: 'Products · Member attributes', note: '2 new product codes in last night’s file' },
  { id: 'src-insights', name: 'Prequalification insights', type: 'insights', cadence: 'API · daily', records: '96 offers', identity: 'Member number', fields: 4, status: 'healthy', feeds: 'Offers', note: 'Provenance: credit prescreen — FCRA firm-offer rules apply' },
  { id: 'src-hubspot', name: 'HubSpot', type: 'crm', cadence: 'API · hourly', records: '13,620 contacts', identity: 'Email → member # · 74% match', fields: 12, status: 'healthy', feeds: 'Member attributes', note: null },
  { id: 'src-sdk', name: 'Mobile SDK', type: 'sdk', cadence: 'Real-time events', records: '9,850 devices linked', identity: 'Device → member link', fields: 8, status: 'healthy', feeds: 'Events', note: null },
  { id: 'src-csv', name: 'Winback list — March', type: 'file', cadence: 'One-off upload', records: '5,310 rows', identity: 'Member number', fields: 4, status: 'healthy', feeds: 'Member attributes', note: null },
]

export const SOURCE_TYPE_META = {
  core: { label: 'Core banking', fg: '#1f4a86', bg: '#e6effb' },
  crm: { label: 'CRM', fg: '#c05a8a', bg: '#fbe8f1' },
  sdk: { label: 'SDK', fg: '#1f6f4a', bg: '#e2f4ea' },
  file: { label: 'File', fg: '#8a6d2e', bg: '#fbf1dc' },
  insights: { label: 'Insights', fg: '#7a4fc0', bg: '#efe8fb' },
}

export const SOURCE_GALLERY = ['Fiserv DNA', 'Corelation KeyStone', 'Banno', 'Q2', 'Salesforce', 'Snowflake']

export const IDENTITY_SUMMARY = {
  canonical: 'Member number — assigned by the core',
  joins: [
    { source: 'HubSpot', method: 'email match', rate: 74 },
    { source: 'Mobile SDK', method: 'device link', rate: 92 },
  ],
  unresolved: 312,
}

export const HUBSPOT_FIELD_MAP = [
  ['lifecyclestage', 'Member attribute · Lifecycle stage'],
  ['last_meeting_date', 'Member attribute · Last branch visit'],
  ['hubspot_owner', 'Member attribute · Relationship manager'],
]

/* Mock upload for the self-serve import wizard. */
export const WIZARD_FILE = {
  name: 'aacu_member_products_2026_07.csv',
  size: '2.4 MB',
  rows: 18400,
  columns: [
    { col: 'MBR_NUM', sample: '100482', target: 'Identity · Member number', confidence: 'auto' },
    { col: 'SHR_SAV_BAL', sample: '4,210', target: 'Deposit · Balance', confidence: 'auto' },
    { col: 'AUTO_LN1_BAL', sample: '12,400', target: 'Loan · Balance', confidence: 'auto' },
    { col: 'AUTO_LN1_DUE_DT', sample: '08/01', target: 'Loan · Payment due date', confidence: 'auto' },
    { col: 'AUTO_LN1_RATE', sample: '6.1', target: 'Loan · Interest rate', confidence: 'suggested' },
    { col: 'CERT6_MAT_DT', sample: '01/12', target: 'Certificate · Maturity date', confidence: 'auto' },
    { col: 'VISA_PLT_MIN_PMT', sample: '35', target: 'Card · Minimum payment', confidence: 'suggested' },
    { col: 'SSN', sample: '•••-••-1234', target: null, confidence: 'pii' },
    { col: 'RV_LN_BAL', sample: '18,220', target: null, confidence: 'unmapped' },
  ],
  preview: { matched: 18388, unmatched: 12, newCodes: ['HSA01', 'RV22'] },
}

export const wizardTargetOptions = () => [
  ...CATEGORY_ORDER.flatMap((k) =>
    PRODUCT_CATEGORIES[k].fields.map((f) => `${PRODUCT_CATEGORIES[k].label} · ${f.label}`)
  ),
  'Member attribute · Custom',
]

/* ── product catalog: FI codes → labels + categories ──────────────
   The marketer-facing face of the data model. Codes arrive from the
   FI's feed; mapping them is the only "modeling" a customer ever does.
   The registry (categories + fields) is Pulsate-managed. */
export const seedProductCodes = () => [
  { code: 'SH01', rawCols: 'SHR_SAV_BAL', label: 'Share Savings', category: 'deposit', holders: 11200 },
  { code: 'CLUB2', rawCols: 'HOL_CLB_BAL', label: 'Holiday Club', category: 'deposit', holders: 1840 },
  { code: 'MM01', rawCols: 'MMKT_BAL', label: 'Money Market', category: 'deposit', holders: 2630 },
  { code: 'LN03', rawCols: 'AUTO_LN*_BAL · DUE_DT · RATE', label: 'Auto Loan', category: 'loan', holders: 4310 },
  { code: 'LN07', rawCols: 'PERS_LN_BAL · PERS_LN_DUE', label: 'Personal Loan', category: 'loan', holders: 2110 },
  { code: 'LN12', rawCols: 'HM_EQ_BAL · HM_EQ_DUE_DT', label: 'Home Equity', category: 'loan', holders: 980 },
  { code: 'LN19', rawCols: 'STU_LN_BAL · STU_LN_DUE', label: 'Student Loan', category: 'loan', holders: 640 },
  { code: 'CD06', rawCols: 'CERT6_BAL · CERT6_MAT_DT', label: '6-Month Certificate', category: 'certificate', holders: 1490 },
  { code: 'CD12', rawCols: 'CERT12_BAL · CERT12_MAT_DT', label: '12-Month Certificate', category: 'certificate', holders: 1120 },
  { code: 'CC02', rawCols: 'VISA_PLT_BAL · MIN_PMT', label: 'Visa Platinum', category: 'card', holders: 5230 },
  { code: 'CC05', rawCols: 'VISA_RW_BAL · MIN_PMT', label: 'Visa Rewards', category: 'card', holders: 3470 },
  { code: 'HSA01', rawCols: 'HSA_BAL', label: '', category: null, holders: 312 },
  { code: 'RV22', rawCols: 'RV_LN_BAL · RV_LN_DUE_DT', label: '', category: null, holders: 87 },
]

/* Real Loan Type codes from the 081126 VIP extract, with real record
   counts. Labels are invented placeholders (each CU defines its own
   code meanings) — the five rare codes ship unmapped as the demo task. */
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

export const codeMapped = (c) => !!(c.label.trim() && c.category)

export const FEED_FILES = [
  { file: 'member_export_2026_07_29.csv', when: 'Today · 04:12', rows: 18400, status: 'ok', note: '2 new product codes discovered — HSA01, RV22' },
  { file: 'member_export_2026_07_28.csv', when: 'Yesterday · 04:09', rows: 18391, status: 'ok', note: null },
  { file: 'cert_maturities_2026_07_27.csv', when: 'Jul 27 · 04:15', rows: 2610, status: 'ok', note: null },
  { file: 'member_export_2026_07_26.csv', when: 'Jul 26 · 04:11', rows: 9182, status: 'partial', note: 'Stopped at row 9,182 — malformed date in AUTO_LN2_DUE_DT ("13/45/26")' },
]

/* Matches the mock generator: ~1 in 6 loans/cards has no due date. */
export const DUE_DATE_GAP = { field: 'Payment due date', missingPct: 17, count: 1230 }

export const GAP_AUDIENCE_RULE = {
  quantifier: 'any', category: 'loan', types: [],
  conditions: [{ id: 1, field: 'dueDate', op: 'not_set', value: '', n: 3 }],
}

/* ── flat-file mock for the data-model story (invented, core-export
      flavored; no real FI data) ─────────────────────────────────── */

export const FLAT_FILE_SAMPLE = {
  columns: ['MBR_NUM', 'FNAME', 'LNAME', 'SHR_SAV_BAL', 'AUTO_LN1_BAL', 'AUTO_LN1_DUE_DT', 'AUTO_LN1_RATE', 'AUTO_LN2_BAL', 'AUTO_LN2_DUE_DT', 'AUTO_LN2_RATE', 'PERS_LN_BAL', 'PERS_LN_DUE', 'CERT6_BAL', 'CERT6_MAT_DT', 'VISA_PLT_BAL', 'VISA_PLT_MIN_PMT', 'HM_EQ_BAL', 'HM_EQ_DUE_DT'],
  rows: [
    ['100482', 'Amara', 'Okafor', '4,210', '12,400', '08/01', '6.1', '8,950', '08/03', '5.4', '', '', '', '', '2,100', '35', '', ''],
    ['100517', 'Diego', 'Reyes', '812', '', '', '', '', '', '', '6,000', '08/03', '10,000', '01/12', '', '', '', ''],
    ['100533', 'Priya', 'Sharma', '15,640', '9,300', '08/12', '5.9', '', '', '', '', '', '', '', '450', '25', '44,700', '08/28'],
    ['100561', 'Liam', 'Walsh', '230', '', '', '', '', '', '', '', '', '5,000', '09/30', '', '', '', ''],
  ],
}

export function productFactline(p) {
  const parts = [`$${fmt(p.balance)}`]
  if (p.category === 'loan' || p.category === 'card') {
    parts.push(
      p.dueInDays == null ? 'no due date on file'
        : p.dueInDays < 0 ? `${-p.dueInDays}d overdue`
        : p.dueInDays === 0 ? 'due today'
        : p.dueInDays === 1 ? 'due tomorrow'
        : `due in ${p.dueInDays} days`
    )
  }
  if (p.category === 'certificate') parts.push(`matures in ${p.maturityInDays} days`)
  if (p.drift > 0) parts.push(`drifting +${p.drift}d`)
  return parts.join(' · ')
}

const FIRST = ['Amara', 'Diego', 'Priya', 'Liam', 'Noor', 'Kenji', 'Sofia', 'Marcus', 'Yuki', 'Elena', 'Omar', 'Grace', 'Tomas', 'Aisha', 'Ravi', 'Chloe']
const LAST = ['Okafor', 'Reyes', 'Sharma', 'Walsh', 'Haddad', 'Tanaka', 'Rossi', 'Bennett', 'Ito', 'Novak', 'Farah', 'Kim', 'Silva', 'Ali', 'Patel', 'Dubois']

export function sampleUsers(segmentName, n) {
  const h = hash(segmentName)
  const out = []
  for (let k = 0; k < n; k++) {
    // the extra wrap offset keeps names unique past 16 samples
    const wrap = Math.floor(k / 16)
    const f = FIRST[(h + k * 7 + wrap * 5) % FIRST.length]
    const l = LAST[(h + k * 13 + wrap * 3) % LAST.length]
    const [avFg, avBg] = AVATAR_PALETTE[hash(f + l) % AVATAR_PALETTE.length]
    out.push({
      name: `${f} ${l}`,
      email: `${f}.${l}`.toLowerCase() + '@example.com',
      initials: f[0] + l[0],
      id: '#' + String(100000 + ((h + k * 911) % 899999)),
      avFg,
      avBg,
    })
  }
  return out
}
