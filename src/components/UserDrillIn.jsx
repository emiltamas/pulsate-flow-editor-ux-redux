import { useState } from 'react'
import { fmt, SYMITAR_STATS, datasetMatchedMembers, primaryBlock } from '../data'
import { ChevronLeftIcon, SearchIcon, ProductIcon } from '../icons'

/* Member preview for any audience. Only rule audiences have members to
   show — they are evaluated against the ingested extract. An audience
   without a rule has no evaluated membership, and says so. */
export default function UserDrillIn({ name, kindLabel, count, rule, ctaLabel, onCta, onBack, backLabel = 'All audiences' }) {
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
      : 'No rule to evaluate — this audience has no computed membership yet'

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #edf1f6' }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 800, color: '#2f6fc4', cursor: 'pointer', padding: 0, marginBottom: 12 }}
        >
          <ChevronLeftIcon size={15} />
          {backLabel}
        </button>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#17335f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </h1>
        <p style={{ margin: '5px 0 0', fontSize: 13, color: '#8a95a6', fontWeight: 600 }}>
          Approx. {fmt(count)} {count === 1 ? 'member' : 'members'} · {kindLabel}
        </p>
      </div>

      <div style={{ padding: '12px 24px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1px solid #d8e0ea', borderRadius: 10, padding: '0 12px', height: 40 }}>
          <SearchIcon size={16} stroke="#8a95a6" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members in this audience"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: 'inherit', fontSize: 14, color: '#17335f', fontWeight: 600 }}
          />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {filtered.map((u) => (
          <div key={u.id} style={{ padding: '11px 24px', borderBottom: '1px solid #f4f6fa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: u.avBg, color: u.avFg, fontSize: 13, fontWeight: 800 }}>
                {u.initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1b3a63', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#8a95a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
              </div>
              <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, fontWeight: 600, color: '#b1bccb', flex: 'none' }}>{u.id}</span>
            </div>
            {rule && <MatchedProducts rule={rule} matches={u.matches} />}
          </div>
        ))}
        <div style={{ padding: '16px 24px', textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: '#8a95a6' }}>{moreLabel}</div>
      </div>

      {ctaLabel && (
        <div style={{ borderTop: '1px solid #edf1f6', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, color: '#5a6b85', cursor: 'pointer' }}>
            Back
          </button>
          <button
            onClick={onCta}
            style={{ background: '#2f5aa0', border: '1px solid #2f5aa0', borderRadius: 10, padding: '10px 22px', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 800, color: '#fff', cursor: 'pointer' }}
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
      <div style={{ margin: '7px 0 0 48px', fontSize: 11.5, fontWeight: 700, color: '#8a95a6' }}>
        Matches every filter in this audience
      </div>
    )
  }
  if (matches.length === 0) {
    return (
      <div style={{ margin: '7px 0 0 48px', fontSize: 11.5, fontWeight: 700, color: '#8a95a6' }}>
        Qualified without a matching record in the primary block — enrolls once, member-level
      </div>
    )
  }
  return (
    <div style={{ margin: '7px 0 0 48px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {matches.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f4f7fb', border: '1px solid #e7edf5', borderRadius: 8, padding: '5px 9px' }}>
          <ProductIcon size={12} stroke="#5a7db0" />
          <span style={{ fontSize: 11.5, fontWeight: 800, color: '#1b3a63' }}>{p.label}</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#8a95a6' }}>{p.fact}</span>
        </div>
      ))}
      {matches.length >= 2 && (
        <div style={{ fontSize: 11, fontWeight: 800, color: '#8a6d2e', background: '#fbf1dc', borderRadius: 7, padding: '4px 9px', alignSelf: 'flex-start' }}>
          Will be enrolled once per matching record · {matches.length} enrollments
        </div>
      )}
    </div>
  )
}
