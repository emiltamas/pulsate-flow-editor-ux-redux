#!/usr/bin/env node
/* Ingests a real Symitar VIP extract into the per-FI relational kernel
   (db/schema.sql — the working form of docs/DATA-MODEL.md):

     node --experimental-sqlite tools/ingest-symitar.mjs <VIP.LOAN> <VIP.NAME>

   Everything lands as rows, never schema: one ENTITY_DEF per file shape,
   FIELD_DEFs for the bound columns, a RECORD per loan with the source's
   stable instance key, RECORD_MEMBER rows for primary AND joint holders
   (from NAME records), typed VALUEs with sentinel dates decoded to
   not-set, and CODE_MAP rows for every Loan Type code seen.

   Re-running is an upsert: changed values are written to VALUE_CHANGE
   (old → new), which is what powers drift/date-anchor semantics.

   PII never reaches the DB: no names, SSNs, addresses, phones, emails, or
   raw account numbers — member identity is a salted hash, display ids are
   sequential (M001…). The DB file itself is gitignored. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const [loanPath, namePath] = process.argv.slice(2)
if (!loanPath || !namePath) {
  console.error('usage: node --experimental-sqlite tools/ingest-symitar.mjs <VIP.LOAN> <VIP.NAME>')
  process.exit(1)
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DB_PATH = process.env.PULSATE_DB || path.join(ROOT, 'db', 'pulsate.db')
const FI_ID = 'demo-cu'
const SENT = '--/--/----'

const parse = (f) => {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => l.length)
  return { header: lines[0].split('|'), rows: lines.slice(1).map((l) => l.split('|')) }
}
const col = (p, h) => {
  const i = p.header.findIndex((x) => x.toLowerCase() === h.toLowerCase())
  if (i < 0) throw new Error(`column not found: ${h}`)
  return i
}
const num = (v) => {
  const n = Number((v ?? '').replace(/[,%$]/g, ''))
  return isNaN(n) || (v ?? '').trim() === '' ? null : n
}
const isoDate = (v) => {
  const t = (v ?? '').trim()
  if (!t || t === SENT) return null
  const d = new Date(t)
  if (isNaN(d)) return null
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const m = path.basename(loanPath).match(/(\d{2})(\d{2})(\d{2})/)
const fileDate = m ? `20${m[3]}-${m[1]}-${m[2]}` : new Date().toISOString().slice(0, 10)

const db = new DatabaseSync(DB_PATH)
db.exec('PRAGMA journal_mode = WAL')
db.exec(fs.readFileSync(path.join(ROOT, 'db', 'schema.sql'), 'utf8'))

const meta = {
  get: (k) => db.prepare('SELECT value FROM ingest_meta WHERE key = ?').get(k)?.value ?? null,
  set: (k, v) => db.prepare('INSERT INTO ingest_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(k, String(v)),
}
let salt = meta.get('salt')
if (!salt) { salt = crypto.randomBytes(16).toString('hex'); meta.set('salt', salt) }
const h = (s) => crypto.createHash('sha256').update(salt + '·' + s).digest('hex').slice(0, 16)

const upsertEntity = (name, category, purpose) => {
  db.prepare('INSERT INTO entity_def (fi_id, name, pulsate_category, purpose) VALUES (?, ?, ?, ?) ON CONFLICT(fi_id, name) DO NOTHING').run(FI_ID, name, category, purpose)
  return db.prepare('SELECT id FROM entity_def WHERE fi_id = ? AND name = ?').get(FI_ID, name).id
}
const upsertField = (entityId, name, label, type, role = null) => {
  db.prepare('INSERT INTO field_def (entity_def_id, name, user_label, type, semantic_role) VALUES (?, ?, ?, ?, ?) ON CONFLICT(entity_def_id, name) DO NOTHING').run(entityId, name, label, type, role)
  return db.prepare('SELECT id FROM field_def WHERE entity_def_id = ? AND name = ?').get(entityId, name).id
}

/* ---- entity + field declarations (the only "modeling" in the pipeline).
   Field labels DEFAULT to the source's own column names — we never invent
   vocabulary; relabeling is an explicit catalog action later. ---- */
const loansEntity = upsertEntity('Loans', 'loan', 'both')
const F = {
  type: upsertField(loansEntity, 'Loan Type', 'Loan Type', 'string', 'code'),
  balance: upsertField(loansEntity, 'Loan Balance', 'Loan Balance', 'currency', 'balance'),
  payment: upsertField(loansEntity, 'Payment', 'Payment', 'currency', null),
  rate: upsertField(loansEntity, 'Interest Rate', 'Interest Rate', 'number', null),
  due: upsertField(loansEntity, 'Due Date', 'Due Date', 'date', 'recurring_date'),
  maturity: upsertField(loansEntity, 'Maturity Date', 'Maturity Date', 'date', null),
  open: upsertField(loansEntity, 'Open Date', 'Open Date', 'date', null),
}
const contactEntity = upsertEntity('Member Contact', 'member', 'campaign')
const FC = {
  email: upsertField(contactEntity, 'Has Email', 'Has Email', 'bool', null),
  mobile: upsertField(contactEntity, 'Has Mobile', 'Has Mobile', 'bool', null),
}

/* ---- members from NAME: every person is a member row; the primary (Name
   Type 00) carries the account's display id, joint holders get J-ids ---- */
const name = parse(namePath)
const N = {
  acct: col(name, 'Account Number'), loc: col(name, 'Name Location'),
  type: col(name, 'Name Type'),
  email: col(name, 'E-Mail Address'), mobile: col(name, 'Mobile Phone'),
}
const loan = parse(loanPath)
const L = {
  acct: col(loan, 'Account Number'), id: col(loan, 'Loan ID'), type: col(loan, 'Loan Type'),
  bal: col(loan, 'Loan Balance'), pay: col(loan, 'Payment'), due: col(loan, 'Due Date'),
  rate: col(loan, 'Interest Rate'), mat: col(loan, 'Maturity Date'), open: col(loan, 'Open Date'),
  close: col(loan, 'Close Date'), chargeoff: col(loan, 'Charge-off Date'),
}

/* Account universe = NAME accounts ∪ LOAN accounts (loan-less members count).
   A NAME record's "Name Location" says what the person attaches to: the
   account itself, a share (S####), or a SPECIFIC loan (L####) — loan-scoped
   names become RECORD_MEMBER rows on that loan only, account-level joint
   owners (type 01) on every loan of the account. */
const accounts = new Map() // raw acct → { persons: [{loc, type, seq, email, mobile}] }
for (const r of name.rows) {
  const key = r[N.acct]
  if (!accounts.has(key)) accounts.set(key, { persons: [] })
  const persons = accounts.get(key).persons
  const loc = (r[N.loc] ?? '').trim() || 'Account'
  persons.push({
    loc,
    type: (r[N.type] ?? '').trim(),
    seq: persons.filter((p) => p.loc === loc).length, // ordinal within location
    email: !!(r[N.email] ?? '').trim(),
    mobile: !!(r[N.mobile] ?? '').trim(),
  })
}
for (const r of loan.rows) {
  const key = r[L.acct]
  if (!accounts.has(key)) accounts.set(key, { persons: [] })
}

const insMember = db.prepare('INSERT INTO member (fi_id, code, external_key) VALUES (?, ?, ?) ON CONFLICT(fi_id, external_key) DO NOTHING')
const getMember = db.prepare('SELECT id FROM member WHERE fi_id = ? AND external_key = ?')
const memberId = (extKey, code) => {
  insMember.run(FI_ID, code, extKey)
  return getMember.get(FI_ID, extKey).id
}

const sortedAccts = [...accounts.keys()].sort()
const acctPrimary = new Map() // raw acct → member row id
const acctPersons = new Map() // raw acct → [{id, loc, type}] excluding primary
let mSeq = 0
let jSeq = 0
for (const key of sortedAccts) {
  const a = accounts.get(key)
  const primary = a.persons.find((p) => p.type === '00') ?? a.persons[0] ?? null
  mSeq++
  acctPrimary.set(key, memberId(h(key), `M${String(mSeq).padStart(3, '0')}`))
  const others = []
  for (const p of a.persons) {
    if (p === primary) continue
    jSeq++
    others.push({ id: memberId(h(key) + ':' + p.loc + ':' + p.seq, `J${String(jSeq).padStart(3, '0')}`), loc: p.loc, type: p.type })
  }
  acctPersons.set(key, others)
}

/* ---- generic record/value upsert with change logging ---- */
const getRecord = db.prepare('SELECT id FROM record WHERE entity_def_id = ? AND external_key = ?')
const insRecord = db.prepare('INSERT INTO record (entity_def_id, external_key, status, updated_at) VALUES (?, ?, ?, ?)')
const updRecord = db.prepare('UPDATE record SET status = ?, updated_at = ? WHERE id = ?')
const insHolder = db.prepare('INSERT INTO record_member (record_id, member_id, role) VALUES (?, ?, ?) ON CONFLICT(record_id, member_id) DO NOTHING')
const getValue = db.prepare('SELECT value FROM value WHERE record_id = ? AND field_def_id = ?')
const insValue = db.prepare('INSERT INTO value (record_id, field_def_id, value) VALUES (?, ?, ?) ON CONFLICT(record_id, field_def_id) DO UPDATE SET value = excluded.value')
const delValue = db.prepare('DELETE FROM value WHERE record_id = ? AND field_def_id = ?')
const insChange = db.prepare('INSERT INTO value_change (record_id, field_def_id, old_value, new_value, changed_at) VALUES (?, ?, ?, ?, ?)')

let changes = 0
const setValue = (recordId, fieldId, next) => {
  const v = next === null || next === undefined ? null : String(next)
  const prev = getValue.get(recordId, fieldId)?.value ?? null
  if (prev === v) return
  changes++
  insChange.run(recordId, fieldId, prev, v, fileDate)
  if (v === null) delValue.run(recordId, fieldId)
  else insValue.run(recordId, fieldId, v)
}
const upsertRecord = (entityId, extKey, status) => {
  const found = getRecord.get(entityId, extKey)
  if (found) { updRecord.run(status, fileDate, found.id); return found.id }
  return insRecord.run(entityId, extKey, status, fileDate).lastInsertRowid
}

db.exec('BEGIN')

/* ---- loans: one RECORD per loan, holders = primary + account joints ---- */
const seenLoanKeys = new Map()
let loanCount = 0
for (const r of loan.rows) {
  const acct = r[L.acct]
  let extKey = h(acct) + ':' + ((r[L.id] ?? '').trim() || 'L')
  const dup = seenLoanKeys.get(extKey) ?? 0
  seenLoanKeys.set(extKey, dup + 1)
  if (dup) extKey += '#' + dup // deterministic: file order
  const closed = isoDate(r[L.close]) || isoDate(r[L.chargeoff])
  const rid = upsertRecord(loansEntity, extKey, closed ? 'closed' : 'open')
  insHolder.run(rid, acctPrimary.get(acct), 'primary')
  const loanId = (r[L.id] ?? '').trim()
  for (const p of acctPersons.get(acct) ?? []) {
    // account-level joint owners hold every loan; loan-scoped names (loc
    // L<loan id>) hold only their loan; share/card/EFT names hold none
    if ((p.loc === 'Account' && p.type === '01') || p.loc === 'L' + loanId) insHolder.run(rid, p.id, 'joint')
  }
  setValue(rid, F.type, (r[L.type] ?? '').trim() || null)
  setValue(rid, F.balance, num(r[L.bal]))
  setValue(rid, F.payment, num(r[L.pay]))
  setValue(rid, F.rate, num(r[L.rate]))
  setValue(rid, F.due, isoDate(r[L.due]))
  setValue(rid, F.maturity, isoDate(r[L.mat]))
  setValue(rid, F.open, isoDate(r[L.open]))
  loanCount++
}

/* ---- contact flags: one record per account, all persons attached ---- */
for (const key of sortedAccts) {
  const a = accounts.get(key)
  const rid = upsertRecord(contactEntity, h(key) + ':contact', 'open')
  insHolder.run(rid, acctPrimary.get(key), 'primary')
  for (const p of acctPersons.get(key) ?? []) insHolder.run(rid, p.id, 'joint')
  setValue(rid, FC.email, a.persons.some((p) => p.email))
  setValue(rid, FC.mobile, a.persons.some((p) => p.mobile))
}

/* ---- CODE_MAP for every Loan Type code seen; known labels are the demo
   placeholders (each CU defines its own meanings), rare codes ship
   unmapped — that is the attention queue. User mappings are preserved. ---- */
const KNOWN = {
  '0010': ['Auto Loan', 'loan'], '0011': ['Used Auto Loan', 'loan'], '0040': ['Personal Loan', 'loan'],
  '0000': ['Signature Loan', 'loan'], '0001': ['Share Secured Loan', 'loan'], '0030': ['Home Equity', 'loan'],
  '0031': ['Home Equity — 2nd', 'loan'], '0032': ['HELOC', 'loan'], '0052': ['Student Loan', 'loan'],
  '0090': ['Visa Classic', 'card'], '0091': ['Visa Gold', 'card'], '0092': ['Visa Platinum', 'card'],
  '0093': ['Visa Rewards', 'card'], '0094': ['Business Visa', 'card'],
}
const insCode = db.prepare('INSERT INTO code_map (field_def_id, raw_code, label, category) VALUES (?, ?, ?, ?) ON CONFLICT(field_def_id, raw_code) DO NOTHING')
const codesSeen = new Set(loan.rows.map((r) => (r[L.type] ?? '').trim()).filter(Boolean))
for (const c of [...codesSeen].sort()) {
  const [label, category] = KNOWN[c] ?? ['', null]
  insCode.run(F.type, c, label, category)
}

meta.set('fi_id', FI_ID)
meta.set('file_date', fileDate)
meta.set('loan_file', path.basename(loanPath))
meta.set('name_file', path.basename(namePath))
meta.set('loan_cols', loan.header.length)
meta.set('name_cols', name.header.length)
meta.set('last_ingested_at', new Date().toISOString())
db.exec('COMMIT')

const count = (sql) => db.prepare(sql).get().n
console.log(`ingested ${path.basename(loanPath)} + ${path.basename(namePath)} → ${DB_PATH}`)
console.log(`  file date ${fileDate} · ${loanCount} loan rows`)
console.log(`  members ${count('SELECT COUNT(*) n FROM member')} (${sortedAccts.length} primary) · records ${count('SELECT COUNT(*) n FROM record')} · values ${count('SELECT COUNT(*) n FROM value')}`)
console.log(`  record_member ${count('SELECT COUNT(*) n FROM record_member')} (${count("SELECT COUNT(*) n FROM record_member WHERE role = 'joint'")} joint) · code_map ${count('SELECT COUNT(*) n FROM code_map')} codes (${count("SELECT COUNT(*) n FROM code_map WHERE label = ''")} unmapped)`)
console.log(`  value changes this run: ${changes}`)
