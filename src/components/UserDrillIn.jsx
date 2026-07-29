import { useState } from 'react'
import { SEGMENTS, fmt, sampleUsers } from '../data'
import { ChevronLeftIcon, SearchIcon } from '../icons'

export default function UserDrillIn({ segIndex, selected, onToggle, onBack }) {
  const [query, setQuery] = useState('')
  const segment = SEGMENTS[segIndex]

  const shown = Math.min(8, segment.users)
  const users = sampleUsers(segment.name, shown)
  const q = query.trim().toLowerCase()
  const filtered = q
    ? users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    : users

  const moreLabel = q
    ? filtered.length ? `${filtered.length} of ${shown} shown users match` : 'No matching users in the loaded sample'
    : segment.users > shown
      ? `+ ${fmt(segment.users - shown)} more users`
      : segment.users ? 'End of list' : 'This segment has no users yet'

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #edf1f6' }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 800, color: '#2f6fc4', cursor: 'pointer', padding: 0, marginBottom: 12 }}
        >
          <ChevronLeftIcon size={15} />
          All segments
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#17335f', maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {segment.name}
          </h1>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: selected ? '#fff' : '#8a95a6',
              background: selected ? '#2f7fd6' : '#eef1f6',
              padding: '4px 10px',
              borderRadius: 20,
            }}
          >
            {selected ? 'In entry' : 'Not added'}
          </span>
        </div>
        <p style={{ margin: '5px 0 0', fontSize: 13, color: '#8a95a6', fontWeight: 600 }}>
          Approx. {fmt(segment.users)} {segment.users === 1 ? 'user' : 'users'} · {segment.group} segment
        </p>
      </div>

      <div style={{ padding: '12px 24px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1px solid #d8e0ea', borderRadius: 10, padding: '0 12px', height: 40 }}>
          <SearchIcon size={16} stroke="#8a95a6" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users in this segment"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: 'inherit', fontSize: 14, color: '#17335f', fontWeight: 600 }}
          />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {filtered.map((u) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 24px', borderBottom: '1px solid #f4f6fa' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: u.avBg, color: u.avFg, fontSize: 13, fontWeight: 800 }}>
              {u.initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1b3a63', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#8a95a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
            </div>
            <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, fontWeight: 600, color: '#b1bccb', flex: 'none' }}>{u.id}</span>
          </div>
        ))}
        <div style={{ padding: '16px 24px', textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: '#8a95a6' }}>{moreLabel}</div>
      </div>

      <div style={{ borderTop: '1px solid #edf1f6', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, color: '#5a6b85', cursor: 'pointer' }}>
          Back
        </button>
        <button
          onClick={onToggle}
          style={{
            background: selected ? '#fff' : '#2f5aa0',
            border: `1px solid ${selected ? '#d8e0ea' : '#2f5aa0'}`,
            borderRadius: 10,
            padding: '10px 22px',
            fontFamily: 'inherit',
            fontSize: 14.5,
            fontWeight: 800,
            color: selected ? '#5a6b85' : '#fff',
            cursor: 'pointer',
          }}
        >
          {selected ? 'Remove from entry' : 'Add to entry'}
        </button>
      </div>
    </div>
  )
}
