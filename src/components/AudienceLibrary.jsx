import { useState } from 'react'
import { PRODUCT_CATEGORIES, AUDIENCE_TEMPLATES, tagColor, fmt, ruleSentence, audienceReach, rulePlural } from '../data'
import { SearchIcon, EyeIcon, PencilIcon, SparkleIcon } from '../icons'
import UserDrillIn from './UserDrillIn'

/* Full-page audience library — audiences are first-class, reusable objects. */
export default function AudienceLibrary({ audiences, selectedId, onUse, onNew, onEdit, onActivateTemplate }) {
  const [query, setQuery] = useState('')
  const [viewingId, setViewingId] = useState(null)

  const q = query.trim().toLowerCase()
  const shown = q ? audiences.filter((a) => a.name.toLowerCase().includes(q)) : audiences
  const viewing = audiences.find((a) => a.id === viewingId)

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f4f6fa', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 32px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#17335f', letterSpacing: '-.3px' }}>Audiences</h1>
            <p style={{ margin: '5px 0 0', fontSize: 13.5, color: '#8a95a6', fontWeight: 500 }}>
              Build once, reuse in any automation. Rule audiences stay in sync as member products change.
            </p>
          </div>
          <button
            onClick={onNew}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, background: '#2f5aa0', border: 'none', borderRadius: 10,
              padding: '11px 20px', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, color: '#fff', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(47,90,160,.3)', whiteSpace: 'nowrap',
            }}
          >
            <SparkleIcon size={15} />
            New audience
          </button>
        </div>

        {/* ready-to-launch playbooks */}
        <div style={{ margin: '22px 0 6px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }}>Ready to launch</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#8a95a6' }}>Outcome playbooks, updated daily — activate in one click, then open and edit the rule behind it.</span>
        </div>
        <div style={{ margin: '10px 0 6px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {AUDIENCE_TEMPLATES.map((tpl) => {
            const activated = audiences.some((a) => a.id === `aud-${tpl.id}`)
            return (
              <div key={tpl.id} style={{ background: '#fff', border: '1px solid #dfe7f2', borderRadius: 12, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: tpl.kind === 'Rule' ? '#1f4a86' : '#c05a8a', background: tpl.kind === 'Rule' ? '#e6effb' : '#fbe8f1', padding: '2px 7px', borderRadius: 20 }}>
                    {tpl.kind === 'Rule' ? 'Transparent rule' : 'Predictive'}
                  </span>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#1f6f4a', background: '#e2f4ea', padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' }}>Updated daily</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#17335f', lineHeight: 1.3 }}>{tpl.title}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8a95a6', lineHeight: 1.45, flex: 1 }}>{tpl.blurb}</div>
                <button
                  onClick={() => onActivateTemplate(tpl)}
                  style={{
                    marginTop: 2, border: 'none', borderRadius: 8, padding: '7px 0', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
                    background: activated ? '#eef5fc' : '#2f5aa0', color: activated ? '#1f4a86' : '#fff',
                  }}
                >
                  {activated ? 'Use in flow' : 'Activate & use'}
                </button>
              </div>
            )
          })}
        </div>

        <div style={{ margin: '22px 0 0', fontSize: 11, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }}>Your audiences</div>
        <div style={{ margin: '10px 0 18px', display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1px solid #d8e0ea', borderRadius: 10, padding: '0 12px', height: 40, maxWidth: 420 }}>
          <SearchIcon size={16} stroke="#8a95a6" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${audiences.length} audiences`}
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: 'inherit', fontSize: 14, color: '#17335f', fontWeight: 600 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {shown.map((a) => (
            <AudienceCard
              key={a.id}
              audience={a}
              audiences={audiences}
              selected={a.id === selectedId}
              onUse={() => onUse(a.id)}
              onView={() => setViewingId(a.id)}
              onEdit={a.rule ? () => onEdit(a.id) : null}
            />
          ))}
        </div>
      </div>

      {viewing && (
        <>
          <div onClick={() => setViewingId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,34,60,.34)', zIndex: 30 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, background: '#fff', boxShadow: '-6px 0 28px rgba(20,34,60,.16)', zIndex: 30 }}>
            <UserDrillIn
              name={viewing.name}
              kindLabel={`${viewing.kind} audience`}
              count={audienceReach(viewing, audiences).members}
              rule={viewing.rule}
              ctaLabel="Use in this flow"
              onCta={() => { setViewingId(null); onUse(viewing.id) }}
              onBack={() => setViewingId(null)}
            />
          </div>
        </>
      )}
    </div>
  )
}

function AudienceCard({ audience, audiences, selected, onUse, onView, onEdit }) {
  const reach = audienceReach(audience, audiences)
  return (
    <div style={{ background: '#fff', border: `1px solid ${selected ? '#cfe1f6' : '#e2e8f1'}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: selected ? '0 0 0 2px rgba(47,127,214,.25)' : '0 4px 14px rgba(20,34,60,.06)' }}>
      <div style={{ padding: '14px 16px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14.5, fontWeight: 800, color: '#17335f', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {audience.name}
          </span>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', background: tagColor(audience.kind), padding: '3px 8px', borderRadius: 20, flex: 'none' }}>
            {audience.kind}
          </span>
        </div>
        <div style={{ marginTop: 5, fontSize: 12, fontWeight: 600, color: audience.rule ? '#1f4a86' : '#8a95a6', lineHeight: 1.45, minHeight: 34 }}>
          {audience.rule ? ruleSentence(audience.rule) : `${audience.kind} audience synced from your data.`}
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#17335f', letterSpacing: '-.4px' }}>~{fmt(reach.members)}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#8a95a6' }}>
            members{reach.products !== null && ` · ${fmt(reach.products)} matching ${rulePlural(audience.rule)}`}
          </span>
        </div>
        <div style={{ marginTop: 3, fontSize: 11, fontWeight: 700, color: '#b1bccb' }}>
          {audience.usedIn ? `Used in ${audience.usedIn} automation${audience.usedIn === 1 ? '' : 's'}` : 'Not used yet'}
        </div>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid #edf1f6' }}>
        <CardAction onClick={onView}><EyeIcon size={13} /> Members</CardAction>
        {onEdit && <CardAction onClick={onEdit} divider><PencilIcon size={13} /> Edit</CardAction>}
        <CardAction onClick={onUse} divider primary>{selected ? 'In this flow ✓' : 'Use in flow'}</CardAction>
      </div>
    </div>
  )
}

function CardAction({ onClick, divider, primary, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, border: 'none', background: '#fff', padding: '9px 0', fontFamily: 'inherit',
        fontSize: 12, fontWeight: 800, color: primary ? '#2f5aa0' : '#5a6b85', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        borderLeft: divider ? '1px solid #edf1f6' : 'none',
      }}
    >
      {children}
    </button>
  )
}
