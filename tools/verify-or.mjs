#!/usr/bin/env node
/* Ground-truth verification of OR-join segment evaluation against an
   INDEPENDENT computation from the raw bootstrap payload:

     node --experimental-sqlite tools/verify-or.mjs

   Sets A = members with ≥1 loan-category record, B = card-category,
   computed here from payload data only (never through src/data.js), then
   asserted against the real evaluator. */
import { bootstrapPayload } from './dbApi.mjs'
import {
  hydrateDataset, setActiveCodeMap, segmentReach, segmentSentence, seedAudiences,
} from '../src/data.js'

const p = await bootstrapPayload()
if (!p.available) { console.error('DB unavailable — run npm run ingest first'); process.exit(1) }

// ---- independent ground truth (raw payload only) ----
const catOf = (code) => p.codes.find((c) => c.code === code)?.category ?? null
const A = new Set() // has ≥1 loan-category record
const B = new Set() // has ≥1 card-category record
const loanRecordsOf = new Map()
for (const m of p.members) {
  const loans = m.records['Loans'] ?? []
  const loanRecs = loans.filter((x) => catOf(x.values['Loan Type']) === 'loan')
  const cardRecs = loans.filter((x) => catOf(x.values['Loan Type']) === 'card')
  if (loanRecs.length) { A.add(m.id); loanRecordsOf.set(m.id, loanRecs.length) }
  if (cardRecs.length) B.add(m.id)
}
const total = p.members.length
const union = new Set([...A, ...B])
const inter = [...A].filter((id) => B.has(id)).length
const productsOverA = [...A].reduce((s, id) => s + loanRecordsOf.get(id), 0)

// ---- the real evaluator ----
hydrateDataset(p)
setActiveCodeMap(p.codes)
const anyLoan = { quantifier: 'any', entity: 'Loans', codeCategory: 'loan', types: [], conditions: [] }
const anyCard = { quantifier: 'any', entity: 'Loans', codeCategory: 'card', types: [], conditions: [] }
const noneLoan = { ...anyLoan, quantifier: 'none' }
const noneCard = { ...anyCard, quantifier: 'none' }

let failures = 0
const check = (name, actual, expected) => {
  const ok = actual === expected
  if (!ok) failures++
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: actual=${actual} expected=${expected}`)
}

const orReach = segmentReach({ blocks: [anyLoan, anyCard], joins: ['OR'] })
check('OR members = |A ∪ B|', orReach.members, union.size)
check('OR products = Σ loan records over A (primary = loan block)', orReach.products, productsOverA)
check('OR memberLevel = |A ∪ B| − |A|', orReach.memberLevel, union.size - A.size)

const andReach = segmentReach({ blocks: [anyLoan, anyCard], joins: ['AND'] })
check('AND members = |A ∩ B|', andReach.members, inter)

const noJoins = segmentReach({ blocks: [anyLoan, anyCard] })
check('no-joins segment defaults to AND (back-compat)', noJoins.members, andReach.members)

const deMorgan = segmentReach({ blocks: [noneLoan, noneCard], joins: ['AND'] })
check('De Morgan: none∧none = total − |A ∪ B|', deMorgan.members, total - union.size)
check('De Morgan vs evaluator union', deMorgan.members, total - orReach.members)

const orSentence = segmentSentence({ blocks: [anyLoan, anyCard], joins: ['OR'] })
check('OR sentence parenthesized', orSentence.startsWith('(') && orSentence.includes(' OR ') ? 1 : 0, 1)
const singleSentence = segmentSentence({ blocks: [anyLoan] })
check('single-block sentence has no parens', singleSentence.startsWith('(') ? 1 : 0, 0)

// seeds must be byte-stable under the joins refactor (all implicit AND)
console.log('\nseed reach (regression):')
for (const a of seedAudiences()) {
  const r = segmentReach(a.rule)
  console.log(`  ${a.name} → members=${r.members} products=${r.products} memberLevel=${r.memberLevel}`)
  if (r.memberLevel !== 0) { failures++; console.log(`FAIL ${a.name}: memberLevel should be 0 for pure-AND seeds`) }
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
