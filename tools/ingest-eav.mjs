#!/usr/bin/env node
/* Ingests an EAV-shaped CSV (alias,n,v,t,source,product_id,category) into
   the per-FI relational kernel — the same shape some FIs already export:

     node --experimental-sqlite tools/ingest-eav.mjs <file.csv> \
       --source "Evolve custom attributes" [--file-date YYYY-MM-DD] [--prefix E]

   One ENTITY_DEF per distinct `category` (raw name kept — humanizing is a
   Dictionary act), one FIELD_DEF per distinct `n` (user_label defaults to
   the raw name), one RECORD per (alias, category, product_id). Category
   stays UNKNOWN at ingest: assigning it is curated mapping, not parsing.

   Identity discipline: aliases live in their OWN id space — hashes are
   namespaced ('evolve:<alias>') so a numeric alias can never silently
   merge with a core account number. Cross-source identity stays unlinked
   until someone resolves it, and the UI says so.

   Idempotent: re-runs write only VALUE_CHANGE rows. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const args = process.argv.slice(2)
const csvPath = args.find((a) => !a.startsWith('--'))
const opt = (name, dflt = null) => {
  const i = args.indexOf('--' + name)
  return i >= 0 ? args[i + 1] : dflt
}
if (!csvPath) {
  console.error('usage: node --experimental-sqlite tools/ingest-eav.mjs <file.csv> --source "Name" [--file-date YYYY-MM-DD] [--prefix E]')
  process.exit(1)
}
const sourceName = opt('source', path.basename(csvPath, '.csv'))
const prefix = opt('prefix', 'E')
const sourceId = 'src-' + sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DB_PATH = process.env.PULSATE_DB || path.join(ROOT, 'db', 'pulsate.db')
const FI_ID = 'demo-cu'

/* Quote-aware CSV parser — "$1,000.00" breaks naive splitting. Handles
   unquoted headers, quoted rows, and "" escapes. */
const parseCsv = (text) => {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((c) => c.length)) rows.push(row)
      row = []
    } else cell += ch
  }
  if (cell.length || row.length) { row.push(cell); if (row.some((c) => c.length)) rows.push(row) }
  return rows
}

const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'))
const header = rows[0].map((h) => h.trim().toLowerCase())
const ci = (n) => {
  const i = header.indexOf(n)
  if (i < 0) throw new Error(`column not found: ${n}`)
  return i
}
const C = { alias: ci('alias'), n: ci('n'), v: ci('v'), t: ci('t'), source: ci('source'), pid: ci('product_id'), cat: ci('category') }
const data = rows.slice(1)

const fileDate = opt('file-date')
  ?? (path.basename(csvPath).match(/(\d{4}-\d{2}-\d{2})/)?.[1])
  ?? new Date().toISOString().slice(0, 10)

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
// keep an existing (Symitar) reference date authoritative for normalization
if (!meta.get('file_date')) meta.set('file_date', fileDate)

/* ---- type inference per (category, field): the CSV declares t; '$'
   observed anywhere upgrades numeric → currency ---- */
const fieldsByCat = new Map() // cat → Map(fieldName → { t, sawDollar })
const cats = new Set()
for (const r of data) {
  const cat = r[C.cat].trim()
  const n = r[C.n].trim()
  if (!cat || !n) continue
  cats.add(cat)
  if (!fieldsByCat.has(cat)) fieldsByCat.set(cat, new Map())
  const fmap = fieldsByCat.get(cat)
  if (!fmap.has(n)) fmap.set(n, { t: r[C.t].trim(), sawDollar: false })
  if (r[C.v].trim().startsWith('$')) fmap.get(n).sawDollar = true
}
const mapType = (f) =>
  f.t === 'date_ago' || f.t === 'date' ? 'date'
    : f.t === 'numeric' || f.t === 'integer' ? (f.sawDollar ? 'currency' : 'number')
    : f.t === 'boolean' ? 'bool'
    : 'string'

/* ---- entities + fields ---- */
/* Register the source under its stable key; --source only supplies the
   DEFAULT display name — a rename in the UI survives re-ingest. */
db.prepare('INSERT INTO source_def (fi_id, key, name, type) VALUES (?, ?, ?, ?) ON CONFLICT(fi_id, key) DO NOTHING')
  .run(FI_ID, sourceId, sourceName, 'file')
const sourceDefId = db.prepare('SELECT id FROM source_def WHERE fi_id = ? AND key = ?').get(FI_ID, sourceId).id
const upsertEntity = (name) => {
  db.prepare('INSERT INTO entity_def (fi_id, name, pulsate_category, purpose, source_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT(fi_id, name) DO NOTHING')
    .run(FI_ID, name, 'UNKNOWN', 'both', sourceDefId)
  return db.prepare('SELECT id FROM entity_def WHERE fi_id = ? AND name = ?').get(FI_ID, name).id
}
const upsertField = (entityId, name, type) => {
  db.prepare('INSERT INTO field_def (entity_def_id, name, user_label, type, semantic_role) VALUES (?, ?, ?, ?, NULL) ON CONFLICT(entity_def_id, name) DO NOTHING')
    .run(entityId, name, name, type)
  return db.prepare('SELECT id FROM field_def WHERE entity_def_id = ? AND name = ?').get(entityId, name).id
}
const entityIds = new Map()
const fieldIds = new Map() // cat·n → field id
for (const cat of [...cats].sort()) {
  const eid = upsertEntity(cat)
  entityIds.set(cat, eid)
  for (const [n, f] of fieldsByCat.get(cat)) fieldIds.set(cat + '·' + n, upsertField(eid, n, mapType(f)))
}

/* ---- members: own id space, namespaced hashes ---- */
const insMember = db.prepare('INSERT INTO member (fi_id, code, external_key) VALUES (?, ?, ?) ON CONFLICT(fi_id, external_key) DO NOTHING')
const getMember = db.prepare('SELECT id FROM member WHERE fi_id = ? AND external_key = ?')
const aliases = [...new Set(data.map((r) => r[C.alias].trim()).filter(Boolean))].sort()
const memberIds = new Map()
aliases.forEach((a, i) => {
  const key = h('evolve:' + a)
  insMember.run(FI_ID, `${prefix}${String(i + 1).padStart(4, '0')}`, key)
  memberIds.set(a, getMember.get(FI_ID, key).id)
})

/* ---- records + values, idempotent with change log ---- */
const getRecord = db.prepare('SELECT id FROM record WHERE entity_def_id = ? AND external_key = ?')
const insRecord = db.prepare('INSERT INTO record (entity_def_id, external_key, status, updated_at) VALUES (?, ?, ?, ?)')
const updRecord = db.prepare('UPDATE record SET updated_at = ? WHERE id = ?')
const insHolder = db.prepare('INSERT INTO record_member (record_id, member_id, role) VALUES (?, ?, ?) ON CONFLICT(record_id, member_id) DO NOTHING')
const getValue = db.prepare('SELECT value FROM value WHERE record_id = ? AND field_def_id = ?')
const insValue = db.prepare('INSERT INTO value (record_id, field_def_id, value) VALUES (?, ?, ?) ON CONFLICT(record_id, field_def_id) DO UPDATE SET value = excluded.value')
const delValue = db.prepare('DELETE FROM value WHERE record_id = ? AND field_def_id = ?')
const insChange = db.prepare('INSERT INTO value_change (record_id, field_def_id, old_value, new_value, changed_at) VALUES (?, ?, ?, ?, ?)')

let changes = 0
const setValue = (recordId, fieldId, next) => {
  const v = next === null || next === undefined || next === '' ? null : String(next)
  const prev = getValue.get(recordId, fieldId)?.value ?? null
  if (prev === v) return
  changes++
  insChange.run(recordId, fieldId, prev, v, fileDate)
  if (v === null) delValue.run(recordId, fieldId)
  else insValue.run(recordId, fieldId, v)
}

const cleanValue = (raw, type) => {
  const v = raw.trim()
  if (!v) return null
  if (type === 'currency' || type === 'number') {
    const n = Number(v.replace(/[$,\s]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  if (type === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
  if (type === 'bool') return v === 'true' || v === 'TRUE' ? 'true' : v === 'false' || v === 'FALSE' ? 'false' : null
  return v
}

db.exec('BEGIN')
const recordIds = new Map()
let recordCount = 0
for (const r of data) {
  const alias = r[C.alias].trim()
  const cat = r[C.cat].trim()
  const n = r[C.n].trim()
  if (!alias || !cat || !n) continue
  const rkey = h('evolve:' + alias) + ':' + cat + ':' + (r[C.pid].trim() || '1')
  let rid = recordIds.get(rkey)
  if (rid === undefined) {
    const found = getRecord.get(entityIds.get(cat), rkey)
    if (found) { updRecord.run(fileDate, found.id); rid = found.id }
    else { rid = insRecord.run(entityIds.get(cat), rkey, 'open', fileDate).lastInsertRowid; recordCount++ }
    insHolder.run(rid, memberIds.get(alias), 'primary')
    recordIds.set(rkey, rid)
  }
  const fid = fieldIds.get(cat + '·' + n)
  const type = mapType(fieldsByCat.get(cat).get(n))
  setValue(rid, fid, cleanValue(r[C.v], type))
}

// sources registry entry
{
  const list = JSON.parse(meta.get('sources') ?? '[]')
  const entry = {
    id: sourceId, name: sourceName, type: 'file',
    fileDate, ingestedAt: new Date().toISOString(),
    files: [path.basename(csvPath)],
    entities: [...cats].sort(),
    memberCount: aliases.length,
    identity: 'Source alias — salted hash, unlinked to core accounts',
    upstream: [...new Set(data.map((r) => r[C.source].trim()).filter(Boolean))],
  }
  const i = list.findIndex((s) => s.id === entry.id)
  if (i < 0) list.push(entry); else list[i] = entry
  meta.set('sources', JSON.stringify(list))
}
db.exec('COMMIT')

const count = (sql) => db.prepare(sql).get().n
console.log(`ingested ${path.basename(csvPath)} → ${DB_PATH}`)
console.log(`  source "${sourceName}" · file date ${fileDate} · ${data.length} rows`)
console.log(`  entities: ${[...cats].sort().join(', ')} (category UNKNOWN — assign in the Dictionary)`)
console.log(`  members ${aliases.length} (${prefix}-prefixed, unlinked id space) · records ${recordIds.size} · total members ${count('SELECT COUNT(*) n FROM member')}`)
console.log(`  value changes this run: ${changes}`)
