/* SQLite-backed data API for the prototype. Exposes the ingested kernel
   (db/schema.sql) to the browser as a Vite dev-server middleware:

     GET  /api/bootstrap  → { available, fileDate, stats, accounts, codes }
     POST /api/code-map   → persist a catalog mapping { code, label, category }

   The bootstrap payload reconstructs the exact account/loan shape the
   client evaluates audiences against — but from ENTITY_DEF → RECORD →
   VALUE rows, generically, not from a bespoke loans table. Requires
   Node's built-in sqlite (npm run dev sets --experimental-sqlite).

   If db/pulsate.db does not exist (fresh clone, no source files), the
   endpoint reports unavailable and the app falls back to the bundled
   sanitized dataset. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DB_PATH = process.env.PULSATE_DB || path.join(ROOT, 'db', 'pulsate.db')

async function openDb() {
  if (!fs.existsSync(DB_PATH)) return null
  const { DatabaseSync } = await import('node:sqlite')
  return new DatabaseSync(DB_PATH)
}

const days = (iso, refIso) => (iso ? Math.round((new Date(iso) - new Date(refIso)) / 86400000) : null)

export async function bootstrapPayload() {
  const db = await openDb()
  if (!db) return { available: false }
  try {
    const meta = Object.fromEntries(db.prepare('SELECT key, value FROM ingest_meta').all().map((r) => [r.key, r.value]))
    const fileDate = meta.file_date
    const entity = Object.fromEntries(db.prepare('SELECT id, name FROM entity_def').all().map((r) => [r.name, r.id]))
    const field = Object.fromEntries(db.prepare('SELECT id, name FROM field_def').all().map((r) => [r.name, r.id]))

    // members (primary = the account universe), with holder counts per record
    const members = db.prepare("SELECT id, code FROM member ORDER BY code").all()
    const byMemberId = new Map(members.map((m) => [m.id, m]))
    const holders = db.prepare('SELECT record_id, member_id, role FROM record_member').all()
    const primaryOf = new Map() // record_id → member_id
    const holderCount = new Map() // record_id → n
    const acctNames = new Map() // primary member_id → { names, joint }
    for (const h of holders) {
      holderCount.set(h.record_id, (holderCount.get(h.record_id) ?? 0) + 1)
      if (h.role === 'primary') primaryOf.set(h.record_id, h.member_id)
    }

    // generic pivot: all values grouped per record
    const vals = db.prepare('SELECT record_id, field_def_id, value FROM value').all()
    const byRecord = new Map()
    for (const v of vals) {
      if (!byRecord.has(v.record_id)) byRecord.set(v.record_id, new Map())
      byRecord.get(v.record_id).set(v.field_def_id, v.value)
    }

    const accounts = new Map() // primary member_id → account shape
    const account = (mid) => {
      if (!accounts.has(mid)) accounts.set(mid, { id: byMemberId.get(mid)?.code ?? '?', names: 1, joint: 0, hasEmail: false, hasMobile: false, loans: [] })
      return accounts.get(mid)
    }

    const contacts = db.prepare('SELECT id FROM record WHERE entity_def_id = ? ORDER BY id').all(entity['Member Contact'])
    for (const r of contacts) {
      const mid = primaryOf.get(r.id)
      if (mid == null) continue
      const a = account(mid)
      const v = byRecord.get(r.id) ?? new Map()
      a.hasEmail = v.get(field['Has Email']) === 'true'
      a.hasMobile = v.get(field['Has Mobile']) === 'true'
      a.names = holderCount.get(r.id) ?? 1
      a.joint = a.names - 1
    }

    const num = (x) => (x == null ? null : Number(x))
    const loanRecords = db.prepare('SELECT id, status FROM record WHERE entity_def_id = ? ORDER BY id').all(entity['Loans'])
    for (const r of loanRecords) {
      const mid = primaryOf.get(r.id)
      if (mid == null) continue
      const v = byRecord.get(r.id) ?? new Map()
      const open = v.get(field['Open Date']) ?? null
      account(mid).loans.push({
        code: v.get(field['Loan Type']) ?? null,
        balance: num(v.get(field['Loan Balance'])),
        payment: num(v.get(field['Payment'])),
        rate: num(v.get(field['Interest Rate'])),
        dueInDays: days(v.get(field['Due Date']) ?? null, fileDate),
        maturityInDays: days(v.get(field['Maturity Date']) ?? null, fileDate),
        openYear: open ? Number(open.slice(0, 4)) : null,
        holders: holderCount.get(r.id) ?? 1,
      })
    }

    const out = [...accounts.values()].sort((a, b) => (a.id < b.id ? -1 : 1))
    const allLoans = out.flatMap((a) => a.loans)
    const typeCounts = {}
    for (const l of allLoans) typeCounts[l.code] = (typeCounts[l.code] ?? 0) + 1
    const stats = {
      fileDate,
      accounts: out.length,
      loanAccounts: out.filter((a) => a.loans.length).length,
      loans: allLoans.length,
      multiLoanAccounts: out.filter((a) => a.loans.length >= 2).length,
      maxLoans: Math.max(...out.map((a) => a.loans.length)),
      typeCounts,
      duePast: allLoans.filter((l) => l.dueInDays !== null && l.dueInDays < 0).length,
      dueFuture: allLoans.filter((l) => l.dueInDays !== null && l.dueInDays >= 0).length,
      dueUnset: allLoans.filter((l) => l.dueInDays === null).length,
      maturityUnset: allLoans.filter((l) => l.maturityInDays === null).length,
      emailPct: Math.round((100 * out.filter((a) => a.hasEmail).length) / out.length),
      mobilePct: Math.round((100 * out.filter((a) => a.hasMobile).length) / out.length),
      jointAccounts: out.filter((a) => a.joint > 0).length,
      loanCols: Number(meta.loan_cols),
      nameCols: Number(meta.name_cols),
    }

    const loanFile = meta.loan_file ?? 'VIP.LOAN'
    const codes = db.prepare('SELECT raw_code, label, category FROM code_map WHERE field_def_id = ? ORDER BY raw_code').all(field['Loan Type'])
      .map((c) => ({ code: c.raw_code, rawCols: `Loan Type · ${loanFile.replace(/^\d+\./, '')}`, label: c.label, category: c.category, holders: typeCounts[c.raw_code] ?? 0 }))
      .sort((a, b) => (b.label ? 1 : 0) - (a.label ? 1 : 0) || b.holders - a.holders)

    /* The live registry + generic records, straight from the EAV tables.
       The client UI is entity-agnostic: it renders whatever this says. */
    const fieldRows = db.prepare('SELECT id, entity_def_id, name, user_label, type, semantic_role FROM field_def').all()
    const fieldById = new Map(fieldRows.map((f) => [f.id, f]))
    const registry = db.prepare('SELECT id, name, pulsate_category, purpose FROM entity_def ORDER BY id').all().map((e) => {
      const fields = fieldRows.filter((f) => f.entity_def_id === e.id)
        .map((f) => ({ name: f.name, label: f.user_label, type: f.type, role: f.semantic_role }))
      const codeField = fields.find((f) => f.role === 'code')?.name ?? null
      return { name: e.name, category: e.pulsate_category, purpose: e.purpose, fields, codeField }
    })

    const entityById = Object.fromEntries(db.prepare('SELECT id, name FROM entity_def').all().map((r) => [r.id, r.name]))
    const memberRecords = new Map() // member code → { entityName: [records] }
    for (const r of db.prepare('SELECT id, entity_def_id, external_key, status FROM record ORDER BY id').all()) {
      const mid = primaryOf.get(r.id)
      const m = mid != null ? byMemberId.get(mid) : null
      if (!m) continue
      const values = {}
      for (const [fid, v] of byRecord.get(r.id) ?? []) {
        const f = fieldById.get(fid)
        if (f) values[f.name] = v
      }
      const ent = entityById[r.entity_def_id]
      if (!memberRecords.has(m.code)) memberRecords.set(m.code, {})
      const bucket = memberRecords.get(m.code)
      ;(bucket[ent] = bucket[ent] ?? []).push({ key: r.external_key, status: r.status, holders: holderCount.get(r.id) ?? 1, values })
    }
    const memberRows = [...memberRecords.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([id, records]) => ({ id, records }))

    return { available: true, fileDate, stats, accounts: out, codes, registry, members: memberRows, meta: { lastIngestedAt: meta.last_ingested_at, loanFile: meta.loan_file, nameFile: meta.name_file } }
  } finally {
    db.close()
  }
}

export async function saveCodeMapping({ code, label, category }) {
  const db = await openDb()
  if (!db) return false
  try {
    const field = db.prepare("SELECT id FROM field_def WHERE name = 'Loan Type'").get()
    if (!field) return false
    db.prepare('UPDATE code_map SET label = ?, category = ? WHERE field_def_id = ? AND raw_code = ?')
      .run(label ?? '', category ?? null, field.id, String(code))
    return true
  } finally {
    db.close()
  }
}

const json = (res, status, body) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export function pulsateDbApi() {
  return {
    name: 'pulsate-db-api',
    configureServer(server) {
      server.middlewares.use('/api/bootstrap', async (req, res) => {
        try {
          json(res, 200, await bootstrapPayload())
        } catch (e) {
          json(res, 500, { available: false, error: String(e.message ?? e) })
        }
      })
      server.middlewares.use('/api/code-map', async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { ok: false })
        let body = ''
        req.on('data', (c) => { body += c })
        req.on('end', async () => {
          try {
            json(res, 200, { ok: await saveCodeMapping(JSON.parse(body)) })
          } catch (e) {
            json(res, 400, { ok: false, error: String(e.message ?? e) })
          }
        })
      })
    },
  }
}
