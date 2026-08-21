/* Client for the SQLite-backed data API (tools/dbApi.mjs). The app boots
   from /api/bootstrap when db/pulsate.db has been ingested, and falls back
   to the bundled sanitized dataset when it hasn't (fresh clone). */
export async function loadFromDb() {
  try {
    const r = await fetch('/api/bootstrap')
    if (!r.ok) return null
    const j = await r.json()
    return j.available ? j : null
  } catch {
    return null
  }
}

/* Fire-and-forget: catalog mappings persist into CODE_MAP so they survive
   reloads — mapping a code is real work, not demo state. */
export function persistCodeMapping({ code, label, category }) {
  fetch('/api/code-map', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, label, category }),
  }).catch(() => {})
}

/* Dictionary edits — same doctrine: relabeling a field or categorizing an
   entity is curation work and must survive reloads. */
export function persistFieldMeta({ entity, field, label, role, hidden }) {
  fetch('/api/field-label', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity, field, label, role, hidden }),
  }).catch(() => {})
}

export function persistSourceName({ key, name }) {
  fetch('/api/source-name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, name }),
  }).catch(() => {})
}

export function persistEntityCategory({ entity, category }) {
  fetch('/api/entity-category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity, category }),
  }).catch(() => {})
}
