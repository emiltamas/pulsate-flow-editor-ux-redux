import { useState } from 'react'
import { fmt, SYMITAR_STATS, datasetMatchedMembers, primaryBlock } from '../data'
import { ChevronLeftIcon, SearchIcon, ProductIcon } from '../icons'

/* Member preview for any audience. Only rule audiences have members to
   show — they are evaluated against the ingested extract. An audience
   without a rule has no evaluated membership, and says so. */
export default function UserDrillIn({ name, kindLabel, count, rule, ctaLabel, onCta, onBack, backLabel = 'All segments' }) {
  const [query, setQuery] = useState('')

  const shown = Math.min(8, count)
  const users = rule ? datasetMatchedMembers(rule, shown || 8) : []

  const q = query.trim().toLowerCase()
  const filtered = q
    ? users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    : users

  const moreLabel = q
    ? filtered.length ? `${filtered.length} of ${users.length} shown members match` : 'No matching members in the loaded sample'
    : rule
      ? `Matched in the ${SYMITAR_STATS.fileDate} extract · synthetic display names`
      : 'No rule to evaluate — this segment has no computed membership yet'

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #edf1f6' }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#2f6fc4', cursor: 'pointer', padding: 0, marginBottom: 12 }}
        >
          <ChevronLeftIcon size={15} />
          {backLabel}
        </button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#2e3d66', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </h1>
        <p style={{ margin: '5px 0 0', fontSize: 14, color: '#8a95a6', fontWeight: 600 }}>
          Approx. {fmt(count)} {count === 1 ? 'member' : 'members'} · {kindLabel}
        </p>
      </div>

      <div style={{ padding: '12px 24px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1px solid #d8e0ea', borderRadius: 4, padding: '0 12px', height: 40 }}>
          <SearchIcon size={16} stroke="#8a95a6" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members in this segment"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: 'inherit', fontSize: 15, color: '#2e3d66', fontWeight: 600 }}
          />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {filtered.map((u) => (
          <div key={u.id} style={{ padding: '11px 24px', borderBottom: '1px solid #eef0fa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: u.avBg, color: u.avFg, fontSize: 14, fontWeight: 600 }}>
                {u.initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15.5, fontWeight: 500, color: '#1b3a63', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#8a95a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
              </div>
              <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, fontWeight: 600, color: '#b1bccb', flex: 'none' }}>{u.id}</span>
            </div>
            {rule && <MatchedProducts rule={rule} matches={u.matches} />}
          </div>
        ))}
        <div style={{ padding: '16px 24px', textAlign: 'center', fontSize: 13.5, fontWeight: 500, color: '#8a95a6' }}>{moreLabel}</div>
      </div>

      {ctaLabel && (
        <div style={{ borderTop: '1px solid #edf1f6', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 15.5, fontWeight: 500, color: '#5a6b85', cursor: 'pointer' }}>
            Back
          </button>
          <button
            onClick={onCta}
            style={{ background: '#2d4b8a', border: '1px solid #2d4b8a', borderRadius: 4, padding: '10px 22px', fontFamily: 'inherit', fontSize: 15.5, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
          >
            {ctaLabel}
          </button>
        </div>
      )}
    </div>
  )
}

function MatchedProducts({ rule, matches }) {
  // all-'none' segments are pure person-level filters — there are no
  // enrolling records to list
  if (!primaryBlock(rule)) {
    return (
      <div style={{ margin: '7px 0 0 48px', fontSize: 12.5, fontWeight: 500, color: '#8a95a6' }}>
        Matches all blocks
      </div>
    )
  }
  if (matches.length === 0) {
    return (
      <div style={{ margin: '7px 0 0 48px', fontSize: 12.5, fontWeight: 500, color: '#8a95a6' }}>
        Qualifies via an OR path
      </div>
    )
  }
  return (
    <div style={{ margin: '7px 0 0 48px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {matches.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f4f7fb', border: '1px solid #e7edf5', borderRadius: 4, padding: '5px 9px' }}>
          <ProductIcon size={12} stroke="#5a7db0" />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1b3a63' }}>{p.label}</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8a95a6' }}>{p.fact}</span>
        </div>
      ))}
    </div>
  )
}
