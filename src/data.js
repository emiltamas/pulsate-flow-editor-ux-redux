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
      { key: 'rate', label: 'Interest rate', type: 'number' },
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

export const EMPTY_PRODUCT_RULE = { quantifier: 'any', category: null, types: [], conditions: [], recurring: false }

export const fieldByKey = (category, key) => PRODUCT_CATEGORIES[category].fields.find((f) => f.key === key)
export const operatorsFor = (type) => OPERATORS[type] ?? OPERATORS.number
export const ruleActive = (rule) => !!(rule && rule.category)

export function conditionText(category, c) {
  const f = fieldByKey(category, c.field)
  const name = f.label.toLowerCase()
  if (c.op === 'not_set') return `${name} is not set`
  if (c.op === 'is_set') return `${name} is set`
  if (f.type === 'date') {
    if (c.op === 'tomorrow') return `${name} is tomorrow`
    if (c.op === 'next_n') return `${name} is in the next ${Number(c.n) || 3} days`
    if (c.op === 'more_than_n_away') return `${name} is more than ${Number(c.n) || 30} days away`
    if (c.op === 'before_date') return `${name} is before ${fmtDateValue(c.value)}`
    if (c.op === 'after_date') return `${name} is after ${fmtDateValue(c.value)}`
    if (c.op === 'between_dates') return `${name} is between ${fmtDateValue(c.value)} and ${fmtDateValue(c.value2)}`
    return `${name} was more than ${Number(c.n) || 30} days ago`
  }
  const op = operatorsFor(f.type).find((o) => o.key === c.op)
  const v = f.type === 'currency'
    ? `$${fmt(Number(c.value) || 0)}`
    : `${Number(c.value) || 0}${f.key === 'apy' || f.key === 'rate' ? '%' : ''}`
  return `${name} ${op.label} ${v}`
}

export function ruleSentence(rule) {
  if (!ruleActive(rule)) return null
  const cat = PRODUCT_CATEGORIES[rule.category]
  const plural = rule.quantifier === 'two_plus'
  const scope = rule.types.length
    ? rule.types.join(' or ') + (plural ? 's' : '')
    : plural ? cat.plural : cat.label.toLowerCase()
  const lead = rule.quantifier === 'any' ? 'Any' : rule.quantifier === 'none' ? 'No' : '2 or more'
  const conds = rule.conditions.length
    ? ` where ${rule.conditions.map((c) => conditionText(rule.category, c)).join(' and ')}`
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

export function productMatches(product, rule) {
  if (product.category !== rule.category) return false
  if (rule.types.length && !rule.types.includes(product.label)) return false
  return rule.conditions.every((c) => {
    const f = fieldByKey(rule.category, c.field)
    if (f.type === 'date') {
      const d = c.field === 'maturity' ? product.maturityInDays : product.dueInDays
      if (c.op === 'not_set') return d == null
      if (c.op === 'is_set') return d != null
      if (d == null) return false // unset never matches a value comparison
      if (c.op === 'tomorrow') return d === 1
      if (c.op === 'next_n') return d >= 0 && d <= (Number(c.n) || 3)
      if (c.op === 'more_than_n_away') return d > (Number(c.n) || 30)
      if (c.op === 'before_date') { const t = daysUntil(c.value); return t != null && d <= t }
      if (c.op === 'after_date') { const t = daysUntil(c.value); return t != null && d > t }
      if (c.op === 'between_dates') {
        const t1 = daysUntil(c.value)
        const t2 = daysUntil(c.value2)
        return t1 != null && t2 != null && d >= Math.min(t1, t2) && d <= Math.max(t1, t2)
      }
      return d < -(Number(c.n) || 30)
    }
    const pv = product[c.field]
    if (c.op === 'not_set') return pv == null
    if (c.op === 'is_set') return pv != null
    if (pv == null) return false
    const v = Number(c.value) || 0
    return c.op === 'gt' ? pv > v : pv < v
  })
}

export const matchedProducts = (seed, rule) => memberProducts(seed).filter((p) => productMatches(p, rule))

export const memberSatisfies = (matchCount, quantifier) =>
  quantifier === 'none' ? matchCount === 0 : quantifier === 'two_plus' ? matchCount >= 2 : matchCount >= 1

/* Deterministic "AI" phrase parser — keyword matching, no model calls.
   Returns a product rule or null when no product type is recognized. */
export function parseAudiencePhrase(text) {
  const t = (text || '').toLowerCase()
  if (!t.trim()) return null

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
export function mockPerformance(members) {
  const delivered = Math.round(members * 0.96)
  const opened = Math.round(delivered * 0.64)
  const converted = Math.round(opened * 0.47)
  return { entered: members, delivered, opened, converted, revenue: converted * 168 }
}

export const fmtMoney = (n) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${fmt(n)}`

/* ── audiences as first-class objects ────────────────────────────── */

export const DEMO_RULE = {
  quantifier: 'any', category: 'loan', types: [],
  conditions: [{ id: 1, field: 'dueDate', op: 'next_n', value: '', n: 3 }],
}

export const seedAudiences = () => [
  { id: 'aud-loans-due-soon', name: 'Loans due soon', kind: 'Rule', rule: { ...DEMO_RULE }, baseIds: [], usedIn: 2 },
  ...SEGMENTS.map((s, i) => ({ id: `aud-seg-${i}`, name: s.name, kind: s.group, users: s.users, rule: null, baseIds: [], usedIn: (i * 7) % 4 })),
]

/* Reach for an audience object; rule audiences narrow their base
   (all members, or the union of their start-from audiences). */
export function audienceReach(a, all = []) {
  const base = a.baseIds?.length
    ? Math.min(TOTAL_MEMBERS, a.baseIds.reduce((s, id) => s + (all.find((x) => x.id === id)?.users || 0), 0))
    : TOTAL_MEMBERS
  if (a.rule) return productReach(a.rule, base)
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
