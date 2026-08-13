#!/usr/bin/env node
/* Symitar VIP extract analyzer — tests whether a real FI extract satisfies
   the prototype's registry model. Run against files kept OUTSIDE the repo:

     node tools/analyze-extract.mjs path/to/VIP.LOAN [path/to/VIP.NAME]

   Prints aggregate statistics only — never member-level values. */
import fs from 'node:fs'
import { PRODUCT_CATEGORIES } from '../src/data.js'

const [loanPath, namePath] = process.argv.slice(2)
if (!loanPath) {
  console.error('usage: node tools/analyze-extract.mjs <VIP.LOAN> [<VIP.NAME>]')
  process.exit(1)
}

const DATE_SENTINEL = '--/--/----'

const parse = (file) => {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.length)
  return { header: lines[0].split('|'), rows: lines.slice(1).map((l) => l.split('|')) }
}
const col = (p, h) => p.header.findIndex((x) => x.toLowerCase() === h.toLowerCase())
const pct = (n, d) => `${((100 * n) / d).toFixed(0)}%`

/* Decode Symitar value encodings → null | number | Date | string. The
   registry ingests decoded values; sentinel dates count as NOT SET. */
export const decode = (v, kind) => {
  const t = (v ?? '').trim()
  if (!t) return null
  if (kind === 'date') {
    if (t === DATE_SENTINEL) return null
    const d = new Date(t)
    return isNaN(d) ? null : d
  }
  if (kind === 'currency' || kind === 'number') {
    const n = Number(t.replace(/[,%$]/g, ''))
    return isNaN(n) ? null : n
  }
  return t
}

/* Registry binding: raw VIP.LOAN column → registry field (loan category,
   plus maturity which the registry carries on certificates today). */
const LOAN_BINDINGS = [
  { raw: 'Loan Balance', field: 'balance', kind: 'currency' },
  { raw: 'Payment', field: 'payment', kind: 'currency' },
  { raw: 'Due Date', field: 'dueDate', kind: 'date' },
  { raw: 'Interest Rate', field: 'rate', kind: 'number' },
  { raw: 'Maturity Date', field: 'maturity (registry: certificate)', kind: 'date' },
]
const IDENTITY_BINDINGS = ['Account Number', 'Loan ID', 'Loan Type', 'Open Date', 'Close Date', 'Charge-off Date']
const PII_PATTERN = /ssn|tin\b|birth|maiden|passport|driver|license|social/i

const loan = parse(loanPath)
console.log(`\n═ VIP.LOAN — ${loanPath}`)
console.log(`${loan.rows.length} loan records · ${loan.header.length} columns`)

// registry coverage
console.log('\n— Registry coverage (loan category) —')
let found = 0
for (const b of LOAN_BINDINGS) {
  const i = col(loan, b.raw)
  if (i < 0) {
    console.log(`  ✗ ${b.field} ← "${b.raw}" NOT FOUND`)
    continue
  }
  found++
  let unset = 0
  for (const r of loan.rows) if (decode(r[i], b.kind) === null) unset++
  console.log(`  ✓ ${b.field} ← "${b.raw}" · ${pct(unset, loan.rows.length)} unset after sentinel decoding`)
}
const idFound = IDENTITY_BINDINGS.filter((h) => col(loan, h) >= 0)
console.log(`  identity/lifecycle: ${idFound.length}/${IDENTITY_BINDINGS.length} present (${idFound.join(', ')})`)
console.log(`  activatable columns: ~${LOAN_BINDINGS.length + IDENTITY_BINDINGS.length} of ${loan.header.length} — the rest is extension-bag or excluded, by design`)

// multi-product
const ai = col(loan, 'Account Number')
const perAcct = new Map()
for (const r of loan.rows) perAcct.set(r[ai], (perAcct.get(r[ai]) ?? 0) + 1)
const hist = {}
for (const n of perAcct.values()) hist[n] = (hist[n] ?? 0) + 1
const multi = [...perAcct.values()].filter((n) => n >= 2).length
console.log('\n— Multi-product reality —')
console.log(`  ${perAcct.size} accounts · ${pct(multi, perAcct.size)} hold 2+ loans · max ${Math.max(...perAcct.values())} loans on one account`)
console.log(`  loans-per-account histogram: ${JSON.stringify(hist)}`)

// type codes
const ti = col(loan, 'Loan Type')
const types = new Map()
for (const r of loan.rows) types.set(r[ti], (types.get(r[ti]) ?? 0) + 1)
console.log(`\n— Product catalog mapping workload —`)
console.log(`  ${types.size} distinct Loan Type codes need label + category mapping:`)
console.log(`  ${[...types.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}×${n}`).join('  ')}`)

// freshness
const di = col(loan, 'Due Date')
const fileDateMatch = loanPath.match(/(\d{2})(\d{2})(\d{2})/)
const ref = fileDateMatch ? new Date(`20${fileDateMatch[3]}-${fileDateMatch[1]}-${fileDateMatch[2]}`) : new Date()
let past = 0
let future = 0
for (const r of loan.rows) {
  const d = decode(r[di], 'date')
  if (d === null) continue
  d < ref ? past++ : future++
}
console.log(`\n— Freshness (vs ${ref.toISOString().slice(0, 10)}) —`)
console.log(`  due dates: ${future} future · ${past} in the past — ${past > future ? 'STALE OR DELINQUENT-HEAVY SAMPLE: date-anchored triggers would fire on almost nothing' : 'looks current'}`)

// PII columns
const pii = loan.header.filter((h) => PII_PATTERN.test(h))
console.log(`\n— PII columns in LOAN header: ${pii.length ? pii.join(', ') : 'none'}`)

if (namePath) {
  const name = parse(namePath)
  console.log(`\n═ VIP.NAME — ${namePath}`)
  console.log(`${name.rows.length} name records · ${name.header.length} columns`)
  const nai = col(name, 'Account Number')
  const nAccts = new Set(name.rows.map((r) => r[nai]))
  let joined = 0
  for (const a of perAcct.keys()) if (nAccts.has(a)) joined++
  console.log(`  join integrity: ${joined}/${perAcct.size} LOAN accounts present in NAME`)

  const populated = (h) => {
    const i = col(name, h)
    if (i < 0) return 'n/a'
    let n = 0
    for (const r of name.rows) if ((r[i] ?? '').trim()) n++
    return pct(n, name.rows.length)
  }
  console.log(`  contactability: e-mail ${populated('E-Mail Address')} · mobile ${populated('Mobile Phone')} populated`)

  const nti = col(name, 'Name Type')
  const primary = name.rows.filter((r) => r[nti] === '00').length
  const jointish = name.rows.filter((r) => r[nti] !== '00').length
  console.log(`  household evidence: ${primary} primary (type 00) · ${jointish} joint/other name records`)

  const npii = name.header.filter((h) => PII_PATTERN.test(h))
  console.log(`  PII columns in NAME header (exclude on ingest): ${npii.join(', ')}`)
}

console.log('\nDone — aggregates only; no member-level values were printed.')
