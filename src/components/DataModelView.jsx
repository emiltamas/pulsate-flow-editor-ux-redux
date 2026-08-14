import { useState } from 'react'
import {
  FLAT_FILE_SAMPLE, FEED_FILES, DUE_DATE_GAP, PRODUCT_CATEGORIES, CATEGORY_ORDER,
  SOURCE_TYPE_META, SOURCE_GALLERY, IDENTITY_SUMMARY, HUBSPOT_FIELD_MAP, SYMITAR_STATS,
  OFFER_FIELDS, expiringOffersCount,
  codeMapped, fmt,
} from '../data'
import { ProductIcon, UsersIcon, SendIcon, RepeatIcon, CloseIcon, ChevronDownIcon } from '../icons'
import SymitarConnect from './SymitarConnect'

const sectionLabel = { fontSize: 11, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }
const mono = 'ui-monospace, Menlo, monospace'
const selectStyle = {
  boxSizing: 'border-box', border: '1px solid #d8e0ea', borderRadius: 9,
  padding: '7px 9px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#17335f',
  outline: 'none', background: '#fff',
}

/* Data is a workspace, prioritized by the marketer's jobs: fix what needs
   fixing (attention queue), check health (KPIs + source list), add
   sources (header CTA), learn how it works (last tab, once). */
export default function DataModelView({ codes, onMapCode, onCreateGapAudience, sources, onOpenWizard, offerCodes, onMapOfferCode, onCreateExpiringAudience }) {
  const [tab, setTab] = useState('sources')
  const [expanded, setExpanded] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [symitarOpen, setSymitarOpen] = useState(false)
  const unmapped = codes.filter((c) => !codeMapped(c)).length + offerCodes.filter((c) => !c.label.trim()).length

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f4f6fa', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 32px 48px' }}>
        {/* header: title + primary action */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#17335f', letterSpacing: '-.3px' }}>Member product data</h1>
            <p style={{ margin: '5px 0 0', fontSize: 13.5, color: '#8a95a6', fontWeight: 500, maxWidth: 640 }}>
              Every audience, playbook and message reads from here. Sample data is invented.
            </p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            style={{ flex: 'none', border: 'none', background: '#2f5aa0', color: '#fff', borderRadius: 10, padding: '10px 20px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(47,90,160,.3)' }}
          >
            + Add source
          </button>
        </div>

        <div style={{ margin: '18px 0 20px', display: 'inline-flex', background: '#e4e9f1', borderRadius: 11, padding: 4, gap: 4 }}>
          <ModeTab on={tab === 'sources'} onClick={() => setTab('sources')} label="Sources" />
          <ModeTab on={tab === 'catalog'} onClick={() => setTab('catalog')} label="Product catalog" badge={unmapped || null} />
          <ModeTab on={tab === 'model'} onClick={() => setTab('model')} label="How it works" />
        </div>

        {tab === 'sources' && (
          <SourcesTab
            sources={sources}
            unmapped={unmapped}
            expanded={expanded}
            onToggleExpand={(id) => setExpanded(expanded === id ? null : id)}
            onMapCodes={() => setTab('catalog')}
            onViewFeed={() => setExpanded('src-symitar')}
            onCreateGapAudience={onCreateGapAudience}
            onCreateExpiringAudience={onCreateExpiringAudience}
          />
        )}
        {tab === 'catalog' && <CatalogTab codes={codes} onMapCode={onMapCode} unmapped={unmapped} offerCodes={offerCodes} onMapOfferCode={onMapOfferCode} />}
        {tab === 'model' && <ModelTab />}
      </div>

      {addOpen && (
        <AddSourceModal
          onClose={() => setAddOpen(false)}
          onUpload={() => { setAddOpen(false); onOpenWizard() }}
          onSymitar={() => { setAddOpen(false); setSymitarOpen(true) }}
        />
      )}
      {symitarOpen && (
        <SymitarConnect
          onClose={() => setSymitarOpen(false)}
          onGoCatalog={() => { setSymitarOpen(false); setTab('catalog') }}
        />
      )}
    </div>
  )
}

function ModeTab({ on, onClick, label, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 800, cursor: 'pointer',
        ...(on ? { background: '#fff', color: '#17335f', boxShadow: '0 1px 3px rgba(20,34,60,.15)' } : { background: 'transparent', color: '#5a6b85' }),
      }}
    >
      {label}
      {badge != null && (
        <span style={{ fontSize: 10.5, fontWeight: 800, color: '#8a6d2e', background: '#fbf1dc', padding: '2px 7px', borderRadius: 20 }}>{badge}</span>
      )}
    </button>
  )
}

/* ── Sources (workspace) ─────────────────────────────────────────── */

function SourcesTab({ sources, unmapped, expanded, onToggleExpand, onMapCodes, onViewFeed, onCreateGapAudience, onCreateExpiringAudience }) {
  const weakestJoin = IDENTITY_SUMMARY.joins.reduce((a, b) => (a.rate < b.rate ? a : b))
  const attention = [
    unmapped > 0 && {
      text: `${unmapped} product ${unmapped === 1 ? 'code needs' : 'codes need'} mapping — arrived in last night’s file`,
      action: 'Map codes', onClick: onMapCodes,
    },
    {
      text: `${Math.round((100 * SYMITAR_STATS.duePast) / SYMITAR_STATS.loans)}% of due dates in the last core file are in the past — the extract may be stale`,
      action: 'View feed', onClick: onViewFeed,
    },
    {
      text: 'One feed file partially ingested — malformed date in AUTO_LN2_DUE_DT',
      action: 'View feed', onClick: onViewFeed,
    },
    {
      text: `${fmt(IDENTITY_SUMMARY.unresolved)} identity records unresolved across sources`,
      action: 'Review', onClick: () => {},
    },
    {
      text: `${DUE_DATE_GAP.field} is blank on ${DUE_DATE_GAP.missingPct}% of loans (≈${fmt(DUE_DATE_GAP.count)} records)`,
      action: 'Create audience', onClick: onCreateGapAudience,
    },
    {
      text: `${expiringOffersCount(14)} offers expire in the next 14 days — campaign window closing`,
      action: 'Create audience', onClick: onCreateExpiringAudience,
    },
  ].filter(Boolean)

  return (
    <>
      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        <Kpi big={String(sources.length)} label="sources connected" />
        <Kpi big="18,400" label="members unified" />
        <Kpi big={`${weakestJoin.rate}%`} label={`weakest identity join — ${weakestJoin.source}`} warn={weakestJoin.rate < 85} />
        <Kpi big="04:12" label="last core sync — today" />
      </div>

      {/* needs attention */}
      {attention.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #f0e3c0', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f7f0dd', background: '#fffdf5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...sectionLabel, color: '#8a6d2e' }}>Needs attention</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#8a6d2e', background: '#fbf1dc', padding: '2px 8px', borderRadius: 20 }}>{attention.length}</span>
          </div>
          {attention.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', borderTop: i ? '1px solid #faf6ea' : 'none' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d9a13c', flex: 'none' }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: '#1b3a63' }}>{a.text}</span>
              <button
                onClick={a.onClick}
                style={{ flex: 'none', border: '1px solid #cfe1f6', background: '#eef5fc', color: '#1f4a86', borderRadius: 8, padding: '6px 13px', fontFamily: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {a.action}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* source list */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
        {sources.map((s, i) => {
          const meta = SOURCE_TYPE_META[s.type]
          const open = expanded === s.id
          return (
            <div key={s.id} style={{ borderTop: i ? '1px solid #f4f6fa' : 'none' }}>
              <div
                className="row"
                onClick={() => onToggleExpand(s.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer' }}
              >
                <span style={{ width: 230, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: '#17335f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: meta.fg, background: meta.bg, padding: '2px 7px', borderRadius: 20, flex: 'none' }}>{meta.label}</span>
                </span>
                <span style={{ width: 140, flex: 'none', fontSize: 12, fontWeight: 600, color: '#5a6b85' }}>{s.cadence}</span>
                <span style={{ width: 130, flex: 'none', fontSize: 12, fontWeight: 700, color: '#4a6088' }}>{s.records}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: '#5a6b85', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.identity}</span>
                {s.feeds && (
                  <span style={{ flex: 'none', fontSize: 11, fontWeight: 800, color: '#7a4fc0', background: '#efe8fb', padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>→ {s.feeds}</span>
                )}
                <span style={{ width: 70, flex: 'none', fontSize: 12, fontWeight: 600, color: '#8a95a6' }}>{s.fields} fields</span>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: '#1f6f4a', background: '#e2f4ea', padding: '3px 9px', borderRadius: 20, flex: 'none' }}>Healthy</span>
                <span style={{ flex: 'none', color: '#8a95a6', display: 'flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
                  <ChevronDownIcon size={14} />
                </span>
              </div>
              {open && <SourceDetail source={s} />}
            </div>
          )
        })}
      </div>

      {/* identity resolution — compact */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap' }}>
        <span style={sectionLabel}>Identity</span>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#8a95a6' }}>Canonical key</div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#17335f' }}>{IDENTITY_SUMMARY.canonical}</div>
        </div>
        {IDENTITY_SUMMARY.joins.map((j) => (
          <div key={j.source}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#8a95a6' }}>{j.source} · {j.method}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 80, height: 6, borderRadius: 6, background: '#eef1f6', overflow: 'hidden' }}>
                <div style={{ width: `${j.rate}%`, height: '100%', background: j.rate >= 85 ? '#1f6f4a' : '#d9a13c' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#17335f' }}>{j.rate}%</span>
            </div>
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: '#8a6d2e', background: '#fbf1dc', padding: '4px 10px', borderRadius: 20 }}>
          {fmt(IDENTITY_SUMMARY.unresolved)} unresolved
        </span>
      </div>
    </>
  )
}

function Kpi({ big, label, warn }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 12, padding: '12px 15px' }}>
      <div style={{ fontSize: 21, fontWeight: 800, color: warn ? '#8a6d2e' : '#17335f', letterSpacing: '-.4px' }}>{big}</div>
      <div style={{ marginTop: 1, fontSize: 11, fontWeight: 600, color: '#8a95a6', lineHeight: 1.4 }}>{label}</div>
    </div>
  )
}

function SourceDetail({ source }) {
  return (
    <div style={{ padding: '4px 16px 14px 16px', background: '#fafbfd' }}>
      {source.id === 'src-symitar' && (
        <div style={{ border: '1px solid #edf1f6', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
          {FEED_FILES.map((f, i) => (
            <div key={f.file} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 13px', borderTop: i ? '1px solid #f4f6fa' : 'none' }}>
              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, flex: 'none', color: f.status === 'ok' ? '#1f6f4a' : '#a33c3c', background: f.status === 'ok' ? '#e2f4ea' : '#fbe3e3' }}>
                {f.status === 'ok' ? 'Processed' : 'Partial'}
              </span>
              <span style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: '#17335f', flex: 'none' }}>{f.file}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#8a95a6', flex: 'none' }}>{f.when}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#4a6088', flex: 'none' }}>{fmt(f.rows)} rows</span>
              {f.note && <span style={{ fontSize: 11, fontWeight: 700, color: f.status === 'ok' ? '#8a6d2e' : '#a33c3c', minWidth: 0 }}>{f.note}</span>}
            </div>
          ))}
        </div>
      )}
      {source.id === 'src-hubspot' && (
        <div style={{ border: '1px solid #edf1f6', borderRadius: 10, background: '#fff', padding: '10px 13px' }}>
          {HUBSPOT_FIELD_MAP.map(([raw, target]) => (
            <div key={raw} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 11.5, padding: '3px 0' }}>
              <span style={{ fontFamily: mono, fontWeight: 600, color: '#c05a8a' }}>{raw}</span>
              <span style={{ color: '#c3ccd9' }}>→</span>
              <span style={{ fontWeight: 700, color: '#1b3a63' }}>{target}</span>
            </div>
          ))}
        </div>
      )}
      {source.id !== 'src-symitar' && source.id !== 'src-hubspot' && (
        <div style={{ fontSize: 12, fontWeight: 600, color: '#8a95a6', padding: '6px 2px' }}>
          {source.note ?? 'No recent activity to show.'}
        </div>
      )}
      {source.note && source.id === 'src-symitar' && (
        <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 700, color: '#8a6d2e', background: '#fbf1dc', borderRadius: 8, padding: '6px 10px', display: 'inline-block' }}>{source.note}</div>
      )}
    </div>
  )
}

/* ── Add source modal ─────────────────────────────────────────────── */

const CONNECTED = ['Symitar', 'HubSpot']

function AddSourceModal({ onClose, onUpload, onSymitar }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,34,60,.34)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', zIndex: 30 }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 560, background: '#fff', borderRadius: 16, boxShadow: '0 24px 64px rgba(20,34,60,.3)', zIndex: 31, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#17335f', letterSpacing: '-.3px' }}>Connect a source</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, fontWeight: 600, color: '#8a95a6' }}>Files today, connectors as they land.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a95a6', padding: 2, display: 'flex' }}>
            <CloseIcon size={19} />
          </button>
        </div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
          <button
            onClick={onUpload}
            style={{ border: '1.5px dashed #7ba4d6', background: '#f7fafd', color: '#1f4a86', borderRadius: 11, padding: '16px 10px', fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer', textAlign: 'center' }}
          >
            Upload a file
            <div style={{ marginTop: 3, fontSize: 10.5, fontWeight: 600, color: '#5a7db0' }}>CSV or SFTP export</div>
          </button>
          <button
            onClick={onSymitar}
            style={{ border: '1px solid #dcefe3', background: '#f6fbf8', borderRadius: 11, padding: '16px 10px', textAlign: 'center', fontFamily: 'inherit', cursor: 'pointer' }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1b3a63' }}>Symitar</div>
            <div style={{ marginTop: 3, fontSize: 10.5, fontWeight: 800, color: '#1f6f4a' }}>✓ Connected · view setup</div>
          </button>
          <div style={{ border: '1px solid #dcefe3', background: '#f6fbf8', borderRadius: 11, padding: '16px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1b3a63' }}>HubSpot</div>
            <div style={{ marginTop: 3, fontSize: 10.5, fontWeight: 800, color: '#1f6f4a' }}>✓ Connected</div>
          </div>
          {SOURCE_GALLERY.filter((g) => !CONNECTED.includes(g)).map((g) => (
            <div key={g} style={{ border: '1px solid #e2e8f1', background: '#fafbfd', borderRadius: 11, padding: '16px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#b1bccb' }}>{g}</div>
              <div style={{ marginTop: 3, fontSize: 10.5, fontWeight: 700, color: '#c3ccd9' }}>Coming soon</div>
            </div>
          ))}
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 11.5, fontWeight: 600, color: '#8a95a6' }}>
          Your warehouse is a source, not a competitor — Pulsate stores only what it can activate.
        </p>
      </div>
    </>
  )
}

/* ── Product catalog ─────────────────────────────────────────────── */

function CatalogTab({ codes, onMapCode, unmapped, offerCodes, onMapOfferCode }) {
  return (
    <>
      {unmapped > 0 && (
        <div style={{ marginBottom: 14, background: '#fbf1dc', borderRadius: 12, padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#8a6d2e', lineHeight: 1.5 }}>
          {unmapped} new product {unmapped === 1 ? 'code' : 'codes'} arrived in last night’s file. Give {unmapped === 1 ? 'it' : 'them'} a label and a
          category and {unmapped === 1 ? 'it becomes' : 'they become'} targetable everywhere — audiences, playbooks, messages.
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Code', 'Raw columns', 'Members', 'Label — what marketers see', 'Category', 'Status'].map((h) => (
                <th key={h} style={{ ...sectionLabel, textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid #edf1f6', background: '#fafbfd' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => {
              const mapped = codeMapped(c)
              return (
                <tr key={c.code} style={{ background: mapped ? '#fff' : '#fffdf5' }}>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f4f6fa' }}>
                    <span style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: '#17335f', background: '#eef1f6', padding: '3px 8px', borderRadius: 6 }}>{c.code}</span>
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f4f6fa', fontFamily: mono, fontSize: 11, fontWeight: 600, color: '#8a95a6' }}>{c.rawCols}</td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f4f6fa', fontWeight: 700, color: '#4a6088' }}>{fmt(c.holders)}</td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f4f6fa' }}>
                    <input
                      value={c.label}
                      placeholder="e.g. HSA Savings"
                      onChange={(e) => onMapCode(c.code, { label: e.target.value })}
                      style={{ ...selectStyle, width: 190 }}
                    />
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f4f6fa' }}>
                    <select
                      value={c.category ?? ''}
                      onChange={(e) => onMapCode(c.code, { category: e.target.value || null })}
                      style={{ ...selectStyle, width: 130 }}
                    >
                      <option value="">Choose…</option>
                      {CATEGORY_ORDER.map((k) => (
                        <option key={k} value={k}>{PRODUCT_CATEGORIES[k].label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f4f6fa' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 20, color: mapped ? '#1f6f4a' : '#8a6d2e', background: mapped ? '#e2f4ea' : '#fbf1dc', whiteSpace: 'nowrap' }}>
                      {mapped ? 'Mapped' : 'Needs mapping'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* offer types — the second entity's vocabulary */}
      <div style={{ margin: '18px 0 8px', fontSize: 11, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }}>
        Offer types — from your insights feed
      </div>
      <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Code', 'Source', 'Offers', 'Label — what marketers see', 'Status'].map((h) => (
                <th key={h} style={{ ...sectionLabel, textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid #edf1f6', background: '#fafbfd' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {offerCodes.map((c) => {
              const mapped = !!c.label.trim()
              return (
                <tr key={c.code} style={{ background: mapped ? '#fff' : '#fffdf5' }}>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f4f6fa' }}>
                    <span style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: '#17335f', background: '#efe8fb', padding: '3px 8px', borderRadius: 6 }}>{c.code}</span>
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f4f6fa', fontSize: 12, fontWeight: 600, color: '#8a95a6' }}>{c.source}</td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f4f6fa', fontWeight: 700, color: '#4a6088' }}>{c.offers}</td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f4f6fa' }}>
                    <input
                      value={c.label}
                      placeholder="e.g. RV loan pre-approval"
                      onChange={(e) => onMapOfferCode(c.code, { label: e.target.value })}
                      style={{ ...selectStyle, width: 230 }}
                    />
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f4f6fa' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 20, color: mapped ? '#1f6f4a' : '#8a6d2e', background: mapped ? '#e2f4ea' : '#fbf1dc', whiteSpace: 'nowrap' }}>
                      {mapped ? 'Mapped' : 'Needs mapping'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* the registry — the Pulsate-managed opinion */}
      <div style={{ marginTop: 14, background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, padding: 16 }}>
        <span style={sectionLabel}>The registry — managed by Pulsate</span>
        <p style={{ margin: '5px 0 12px', fontSize: 12.5, fontWeight: 600, color: '#8a95a6', lineHeight: 1.5, maxWidth: 720 }}>
          Categories and their fields are curated and versioned by Pulsate — they’re what operators, rule sentences, playbooks and
          date anchors bind to. Your labels above stay yours; the semantics underneath stay consistent for every FI.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {CATEGORY_ORDER.map((k) => {
            const cat = PRODUCT_CATEGORIES[k]
            return (
              <div key={k} style={{ border: '1px solid #e7edf5', background: '#f7fafd', borderRadius: 11, padding: '11px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: '#1b3a63' }}>
                  <ProductIcon size={13} stroke="#5a7db0" />
                  {cat.label}
                </div>
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {cat.fields.map((f) => (
                    <div key={f.key} style={{ fontSize: 11.5, fontWeight: 600, color: '#5a6b85' }}>
                      {f.label} <span style={{ color: '#b1bccb' }}>· {f.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          <div style={{ border: '1px solid #e4dcf5', background: '#faf8fe', borderRadius: 11, padding: '11px 13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: '#5b3a9e' }}>
              <ProductIcon size={13} stroke="#7a4fc0" />
              Offer
            </div>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {OFFER_FIELDS.map((f) => (
                <div key={f.key} style={{ fontSize: 11.5, fontWeight: 600, color: '#5a6b85' }}>
                  {f.label} <span style={{ color: '#b1bccb' }}>· {f.type}</span>
                </div>
              ))}
              <div style={{ marginTop: 4, fontSize: 10.5, fontWeight: 700, color: '#8a6d2e' }}>
                Provenance tracked — FCRA firm-offer rules apply to credit-derived offers.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── How it works ─────────────────────────────────────────────────── */

const PIPELINE = [
  { icon: RepeatIcon, title: 'Sources', caption: 'Files, cores, CRMs, SDK' },
  { icon: UsersIcon, title: 'Identity', caption: 'One member across systems' },
  { icon: ProductIcon, title: 'Registry', caption: 'Codes → labeled products & attributes' },
  { icon: SendIcon, title: 'Activation', caption: 'Audiences, triggers, messages' },
]

function ModelTab() {
  const [mode, setMode] = useState('flat')
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, padding: '12px 8px', marginBottom: 16 }}>
        {PIPELINE.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.title} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '2px 8px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: '#17335f' }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: '#e6effb', color: '#2f6fc4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={13} />
                  </span>
                  {s.title}
                </div>
                <div style={{ marginTop: 3, fontSize: 11, fontWeight: 600, color: '#8a95a6' }}>{s.caption}</div>
              </div>
              {i < PIPELINE.length - 1 && <span style={{ color: '#c3ccd9', fontWeight: 800, fontSize: 15 }}>→</span>}
            </div>
          )
        })}
      </div>

      <div style={{ margin: '0 0 16px', display: 'inline-flex', background: '#e4e9f1', borderRadius: 11, padding: 4, gap: 4 }}>
        <ModeTab on={mode === 'flat'} onClick={() => setMode('flat')} label="Today — flat file" />
        <ModeTab on={mode === 'relational'} onClick={() => setMode('relational')} label="Target — relational" />
      </div>
      {mode === 'flat' ? <FlatView /> : <RelationalView />}
    </>
  )
}

function FlatView() {
  const { columns, rows } = FLAT_FILE_SAMPLE
  const loanCols = new Set(['AUTO_LN1_BAL', 'AUTO_LN1_DUE_DT', 'AUTO_LN1_RATE', 'AUTO_LN2_BAL', 'AUTO_LN2_DUE_DT', 'AUTO_LN2_RATE'])
  return (
    <>
      <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '11px 16px', borderBottom: '1px solid #edf1f6', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: '#5a6b85' }}>member_export_2026_07.csv</span>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#a33c3c', background: '#fbe3e3', padding: '3px 8px', borderRadius: 20 }}>
            18 columns and counting
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11.5, fontFamily: mono, whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c} style={{ padding: '7px 10px', background: loanCols.has(c) ? '#fbe9e9' : '#eef1f6', color: loanCols.has(c) ? '#a33c3c' : '#5a6b85', fontSize: 10, fontWeight: 700, textAlign: 'left', borderRight: '1px solid #e2e8f1' }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((v, j) => (
                    <td key={j} style={{ padding: '7px 10px', borderTop: '1px solid #f4f6fa', borderRight: '1px solid #f4f6fa', color: v ? '#1b3a63' : '#c9d2de', fontWeight: v ? 600 : 400 }}>
                      {v || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Problem title="Columns multiply forever">
          Amara’s second auto loan already needed six extra columns. A third means a new file format — for every FI, every time.
        </Problem>
        <Problem title="Which due date is “the” due date?">
          Personalisation reads one field per member. With AUTO_LN1_DUE_DT and AUTO_LN2_DUE_DT, “your payment is due” can’t pick.
        </Problem>
        <Problem title="Every FI names things differently">
          DUE_DT, PMT_DUE, LN_DUE — the same fact in three spellings. Every import becomes a custom mapping project.
        </Problem>
      </div>
    </>
  )
}

const AMARA_PRODUCTS = [
  { code: 'SH01', label: 'Share Savings', facts: 'Balance $4,210' },
  { code: 'LN03', label: 'Auto Loan', facts: 'Balance $12,400 · payment due 08/01 · 6.1%' },
  { code: 'LN03', label: 'Auto Loan', facts: 'Balance $8,950 · payment due 08/03 · 5.4%' },
  { code: 'CC02', label: 'Visa Platinum', facts: 'Balance $2,100 · min payment $35' },
]

const MAPPINGS = [
  ['AUTO_LN1_BAL', 'Auto Loan № 1', 'Balance'],
  ['AUTO_LN1_DUE_DT', 'Auto Loan № 1', 'Payment due date'],
  ['AUTO_LN2_DUE_DT', 'Auto Loan № 2', 'Payment due date'],
  ['DUE_DT · PMT_DUE · LN_DUE', 'normalized on import', 'Payment due date'],
  ['LN03 (product code)', 'label translation', '“Auto Loan”'],
]

function RelationalView() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 14, alignItems: 'start' }}>
        {/* member → products */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, padding: 16 }}>
          <span style={sectionLabel}>Member</span>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#e2f4ea', color: '#1f6f4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, fontWeight: 800 }}>
              AO
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#17335f' }}>Amara Okafor</div>
              <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: '#b1bccb' }}>#100482 · holds 4 products</div>
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {AMARA_PRODUCTS.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, border: '1px solid #e7edf5', background: '#f7fafd', borderRadius: 10, padding: '8px 11px' }}>
                <ProductIcon size={14} stroke="#5a7db0" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#1b3a63' }}>{p.label}</span>
                    <span style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 700, color: '#8a95a6', background: '#eef1f6', padding: '2px 6px', borderRadius: 5 }}>{p.code}</span>
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#8a95a6', marginTop: 1 }}>{p.facts}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 700, color: '#1f6f4a', background: '#eef9f1', borderRadius: 8, padding: '7px 10px' }}>
            A fifth loan is just another record — no new columns, no new file format.
          </div>
        </div>

        {/* mapping */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, padding: 16 }}>
          <span style={sectionLabel}>Import mapping — raw columns → product records</span>
          <p style={{ margin: '5px 0 10px', fontSize: 12.5, fontWeight: 600, color: '#8a95a6', lineHeight: 1.45 }}>
            Each FI’s columns and codes map once into shared product fields; marketers only ever see the FI’s own labels.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr>
                {['Raw column', 'Product record', 'Field'].map((h) => (
                  <th key={h} style={{ ...sectionLabel, textAlign: 'left', padding: '7px 10px', borderBottom: '1px solid #edf1f6' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MAPPINGS.map((m, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #f4f6fa', fontFamily: mono, fontSize: 11.5, fontWeight: 600, color: '#a33c3c' }}>{m[0]}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #f4f6fa', fontWeight: 700, color: '#1b3a63' }}>{m[1]}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #f4f6fa', fontWeight: 700, color: '#2f6fc4' }}>{m[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 14, background: '#eef5fc', border: '1px solid #cfe1f6', borderRadius: 12, padding: '13px 16px', fontSize: 13.5, fontWeight: 700, color: '#1f4a86', lineHeight: 1.5 }}>
        This is what makes one-rule targeting possible: “Any loan where payment due date is in the next 3 days” — across every loan a member holds, whatever the FI called the columns.
      </div>
    </>
  )
}

function Problem({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #f0d9d9', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#a33c3c' }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: '#5a6b85', lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}
