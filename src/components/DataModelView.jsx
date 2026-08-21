import { useState } from 'react'
import {
  feedFiles, dueDateGap, REGISTRY, LEGACY_MIGRATION, categoryLabel,
  SOURCE_TYPE_META, SOURCE_GALLERY, IDENTITY_SUMMARY, SYMITAR_STATS, INGEST_META,
  showcaseMember,
  codeMapped, fmt,
  entityRecordCount, fieldValueCount, humanizeFieldName, distinctValues,
  identitySummaryFrom, sourceMetaByKey, fieldUsage,
} from '../data'
import { ProductIcon, UsersIcon, SendIcon, RepeatIcon, CloseIcon, ChevronDownIcon } from '../icons'
import SymitarConnect from './SymitarConnect'
import loanHeaders from '../../fixtures/symitar-vip-loan.headers.json'

const sectionLabel = { fontSize: 12, fontWeight: 600, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }
const mono = 'ui-monospace, Menlo, monospace'
const selectStyle = {
  boxSizing: 'border-box', border: '1px solid #d8e0ea', borderRadius: 4,
  padding: '7px 9px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, color: '#2e3d66',
  outline: 'none', background: '#fff',
}

/* Data is a workspace, prioritized by the marketer's jobs: fix what needs
   fixing (attention queue), check health (KPIs + source list), add
   sources (header CTA), learn how it works (last tab, once). */
export default function DataModelView({ codes, onMapCode, onCreateGapAudience, sources, metaSources, onEditField, onEditEntityCategory, onRenameSource }) {
  const [tab, setTab] = useState('sources')
  const [expanded, setExpanded] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [symitarOpen, setSymitarOpen] = useState(false)
  const unmapped = codes.filter((c) => !codeMapped(c)).length

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#eef0fa', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 32px 48px' }}>
        {/* header: title + primary action */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, color: '#2e3d66', letterSpacing: '-.3px' }}>Member data</h1>
            <p style={{ margin: '5px 0 0', fontSize: 14.5, color: '#8a95a6', fontWeight: 500, maxWidth: 640 }}>
              Every segment, playbook and message reads from here. All counts come from the ingested extract — nothing is simulated.
            </p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            style={{ flex: 'none', border: 'none', background: '#2d4b8a', color: '#fff', borderRadius: 4, padding: '10px 20px', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(47,90,160,.3)' }}
          >
            + Add source
          </button>
        </div>

        <div style={{ margin: '18px 0 20px', display: 'inline-flex', background: '#e4e9f1', borderRadius: 4, padding: 4, gap: 4 }}>
          <ModeTab on={tab === 'sources'} onClick={() => setTab('sources')} label="Sources" />
          <ModeTab on={tab === 'catalog'} onClick={() => setTab('catalog')} label="Dictionary" badge={unmapped || null} />
          <ModeTab on={tab === 'migration'} onClick={() => setTab('migration')} label="Migration preview" />
          <ModeTab on={tab === 'model'} onClick={() => setTab('model')} label="How it works" />
        </div>

        {tab === 'sources' && (
          <SourcesTab
            sources={sources}
            metaSources={metaSources}
            onRenameSource={onRenameSource}
            unmapped={unmapped}
            expanded={expanded}
            onToggleExpand={(id) => setExpanded(expanded === id ? null : id)}
            onMapCodes={() => setTab('catalog')}
            onViewFeed={() => setExpanded('src-symitar')}
            onCreateGapAudience={onCreateGapAudience}
          />
        )}
        {tab === 'catalog' && (
          <DictionaryTab
            codes={codes}
            onMapCode={onMapCode}
            unmapped={unmapped}
            metaSources={metaSources}
            onEditField={onEditField}
            onEditEntityCategory={onEditEntityCategory}
          />
        )}
        {tab === 'migration' && <MigrationTab />}
        {tab === 'model' && <ModelTab />}
      </div>

      {addOpen && (
        <AddSourceModal
          onClose={() => setAddOpen(false)}
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
        border: 'none', borderRadius: 4, padding: '9px 18px', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
        ...(on ? { background: '#fff', color: '#2e3d66', boxShadow: '0 1px 3px rgba(20,34,60,.15)' } : { background: 'transparent', color: '#5a6b85' }),
      }}
    >
      {label}
      {badge != null && (
        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#8a6d2e', background: '#fbf1dc', padding: '2px 7px', borderRadius: 4 }}>{badge}</span>
      )}
    </button>
  )
}

/* ── Sources (workspace) ─────────────────────────────────────────── */

function SourcesTab({ sources, metaSources, onRenameSource, unmapped, expanded, onToggleExpand, onMapCodes, onViewFeed, onCreateGapAudience }) {
  const gap = dueDateGap()
  const identity = identitySummaryFrom(metaSources)
  const attention = [
    identity && {
      text: `${identity.parts.length} id spaces are unlinked — members in one source can't be matched to the other yet`,
      action: 'View identity', onClick: onViewFeed,
    },
    unmapped > 0 && {
      text: `${unmapped} ${unmapped === 1 ? 'code needs' : 'codes need'} a label — discovered in the ${SYMITAR_STATS.fileDate} extract`,
      action: 'Map codes', onClick: onMapCodes,
    },
    {
      text: `${Math.round((100 * SYMITAR_STATS.duePast) / SYMITAR_STATS.loans)}% of due dates in the extract are in the past — the file may be stale`,
      action: 'View feed', onClick: onViewFeed,
    },
    gap.count > 0 && {
      text: `${gap.field} is blank on ${gap.missingPct}% of loans (${fmt(gap.count)} ${gap.count === 1 ? 'record' : 'records'})`,
      action: 'Create segment', onClick: onCreateGapAudience,
    },
  ].filter(Boolean)

  return (
    <>
      {/* KPI strip — every number comes from the ingested extract */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        <Kpi big={String(sources.length)} label={sources.length === 1 ? 'source connected' : 'sources connected'} />
        <Kpi big={fmt(SYMITAR_STATS.accounts)} label="members in the extract" />
        <Kpi big={fmt(SYMITAR_STATS.loans)} label="loan records" />
        <Kpi big={SYMITAR_STATS.fileDate} label={INGEST_META?.lastIngestedAt ? `file date · ingested ${new Date(INGEST_META.lastIngestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'extract file date'} />
      </div>

      {/* needs attention */}
      {attention.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #f0e3c0', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f7f0dd', background: '#fffdf5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...sectionLabel, color: '#8a6d2e' }}>Needs attention</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#8a6d2e', background: '#fbf1dc', padding: '2px 8px', borderRadius: 4 }}>{attention.length}</span>
          </div>
          {attention.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', borderTop: i ? '1px solid #faf6ea' : 'none' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d9a13c', flex: 'none' }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, color: '#1b3a63' }}>{a.text}</span>
              <button
                onClick={a.onClick}
                style={{ flex: 'none', border: '1px solid #cfe1f6', background: '#eef5fc', color: '#1f4a86', borderRadius: 4, padding: '6px 13px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {a.action}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* source list */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
        {sources.map((s, i) => {
          const meta = SOURCE_TYPE_META[s.type]
          const open = expanded === s.id
          return (
            <div key={s.id} style={{ borderTop: i ? '1px solid #eef0fa' : 'none' }}>
              <div
                className="row"
                onClick={() => onToggleExpand(s.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer' }}
              >
                <span style={{ width: 230, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  {/* the name is a label the user owns; the stable id
                      underneath it never changes */}
                  <input
                    value={s.name}
                    onClick={(ev) => ev.stopPropagation()}
                    onChange={(ev) => onRenameSource?.(s.id, ev.target.value)}
                    title={`Display name — rename freely. Stable id: ${s.id}`}
                    style={{ width: 148, minWidth: 0, border: '1px solid transparent', borderRadius: 4, padding: '4px 6px', margin: '-4px 0 -4px -6px', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, color: '#2e3d66', outline: 'none', background: 'transparent' }}
                    onFocus={(ev) => { ev.target.style.border = '1px solid #d8e0ea'; ev.target.style.background = '#fff' }}
                    onBlur={(ev) => { ev.target.style.border = '1px solid transparent'; ev.target.style.background = 'transparent' }}
                  />
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: meta.fg, background: meta.bg, padding: '2px 7px', borderRadius: 4, flex: 'none' }}>{meta.label}</span>
                </span>
                <span style={{ width: 140, flex: 'none', fontSize: 13, fontWeight: 600, color: '#5a6b85' }}>{s.cadence}</span>
                <span style={{ width: 130, flex: 'none', fontSize: 13, fontWeight: 500, color: '#4a6088' }}>{s.records}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: '#5a6b85', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.identity}</span>
                {s.feeds && (
                  <span style={{ flex: 'none', fontSize: 12, fontWeight: 600, color: '#7a4fc0', background: '#efe8fb', padding: '3px 9px', borderRadius: 4, whiteSpace: 'nowrap' }}>→ {s.feeds}</span>
                )}
                <span style={{ width: 70, flex: 'none', fontSize: 13, fontWeight: 600, color: '#8a95a6' }}>{s.fields} fields</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1f6f4a', background: '#e2f4ea', padding: '3px 9px', borderRadius: 4, flex: 'none' }}>Healthy</span>
                <span style={{ flex: 'none', color: '#8a95a6', display: 'flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
                  <ChevronDownIcon size={14} />
                </span>
              </div>
              {open && <SourceDetail source={s} />}
            </div>
          )
        })}
      </div>

      {/* identity resolution — per-source id spaces, honest about linkage */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 4, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap' }}>
        <span style={sectionLabel}>Identity</span>
        {identity ? (
          <>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 500, color: '#8a95a6' }}>Id spaces</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#2e3d66' }}>
                {identity.parts.join(' · ')} · <span style={{ color: '#8a6d2e' }}>{identity.linked} linked</span>
              </div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 600, color: '#8a95a6', maxWidth: 380 }}>
              Each source keeps its own salted-hash id space. Nothing is merged until a key
              (SSN-hash, account map) links them — guessing would corrupt segments.
            </span>
          </>
        ) : (
          <>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 500, color: '#8a95a6' }}>Canonical key</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#2e3d66' }}>{IDENTITY_SUMMARY.canonical}</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 600, color: '#8a95a6' }}>
              One source connected — identity resolution starts when a second source needs joining to it.
            </span>
          </>
        )}
      </div>
    </>
  )
}

function Kpi({ big, label, warn }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 4, padding: '12px 15px' }}>
      <div style={{ fontSize: 22, fontWeight: 600, color: warn ? '#8a6d2e' : '#2e3d66', letterSpacing: '-.4px' }}>{big}</div>
      <div style={{ marginTop: 1, fontSize: 12, fontWeight: 600, color: '#8a95a6', lineHeight: 1.4 }}>{label}</div>
    </div>
  )
}

function SourceDetail({ source }) {
  return (
    <div style={{ padding: '4px 16px 14px 16px', background: '#fafbfd' }}>
      {/* provenance line: the stable id and what this source declared —
          the answer to "where did this entity come from?" */}
      <div style={{ padding: '4px 2px 10px', fontSize: 12, fontWeight: 600, color: '#8a95a6' }}>
        <span style={{ fontFamily: mono, color: '#5a6b85' }}>{source.id}</span>
        {' · registered at connection — every entity it declares carries this id'}
        {source.feeds ? `: ${source.feeds}` : ''}
      </div>
      {source.id === 'src-symitar' && (
        <div style={{ border: '1px solid #edf1f6', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
          {feedFiles().map((f, i) => (
            <div key={f.file} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 13px', borderTop: i ? '1px solid #eef0fa' : 'none' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, flex: 'none', color: f.status === 'ok' ? '#1f6f4a' : '#a33c3c', background: f.status === 'ok' ? '#e2f4ea' : '#fbe3e3' }}>
                {f.status === 'ok' ? 'Processed' : 'Partial'}
              </span>
              <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 500, color: '#2e3d66', flex: 'none' }}>{f.file}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8a95a6', flex: 'none' }}>{f.when}</span>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: '#4a6088', flex: 'none' }}>{fmt(f.rows)} rows</span>
              {f.note && <span style={{ fontSize: 12, fontWeight: 500, color: f.status === 'ok' ? '#8a6d2e' : '#a33c3c', minWidth: 0 }}>{f.note}</span>}
            </div>
          ))}
        </div>
      )}
      {source.id !== 'src-symitar' && (
        <div style={{ fontSize: 13, fontWeight: 600, color: '#8a95a6', padding: '6px 2px' }}>
          {source.note ?? 'No recent activity to show.'}
        </div>
      )}
      {source.note && source.id === 'src-symitar' && (
        <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 500, color: '#8a6d2e', background: '#fbf1dc', borderRadius: 4, padding: '6px 10px', display: 'inline-block' }}>{source.note}</div>
      )}
    </div>
  )
}

/* ── Add source modal ─────────────────────────────────────────────── */

function AddSourceModal({ onClose, onSymitar }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,34,60,.34)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', zIndex: 30 }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 560, background: '#fff', borderRadius: 4, boxShadow: '0 24px 64px rgba(20,34,60,.3)', zIndex: 31, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: '#2e3d66', letterSpacing: '-.3px' }}>Connect a source</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, fontWeight: 600, color: '#8a95a6' }}>Files today, connectors as they land.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a95a6', padding: 2, display: 'flex' }}>
            <CloseIcon size={19} />
          </button>
        </div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
          <button
            onClick={onSymitar}
            style={{ border: '1px solid #dcefe3', background: '#f6fbf8', borderRadius: 4, padding: '16px 10px', textAlign: 'center', fontFamily: 'inherit', cursor: 'pointer' }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1b3a63' }}>Symitar</div>
            <div style={{ marginTop: 3, fontSize: 11.5, fontWeight: 600, color: '#1f6f4a' }}>✓ Connected · view setup</div>
          </button>
          {['HubSpot', ...SOURCE_GALLERY].map((g) => (
            <div key={g} style={{ border: '1px solid #e2e8f1', background: '#fafbfd', borderRadius: 4, padding: '16px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#b1bccb' }}>{g}</div>
              <div style={{ marginTop: 3, fontSize: 11.5, fontWeight: 500, color: '#c3ccd9' }}>No connector yet</div>
            </div>
          ))}
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 12.5, fontWeight: 600, color: '#8a95a6' }}>
          Your warehouse is a source, not a competitor — Pulsate stores only what it can activate.
        </p>
      </div>
    </>
  )
}

/* ── Data dictionary: every entity, field and code the sources declared,
   with the curation controls — relabel, categorize, assign roles. The
   raw names stay visible; humanizing is an explicit act. ─────────────── */

const PULSATE_CATEGORIES = ['loan', 'deposit', 'certificate', 'card', 'offer', 'eligibility', 'behavior', 'member', 'other']
const ROLE_OPTIONS = ['balance', 'recurring_date', 'rate']
const rawLooking = (name) => /[_-]/.test(name) || /^[A-Z0-9_]+$/.test(name)

function DictionaryTab({ codes, onMapCode, unmapped, metaSources, onEditField, onEditEntityCategory }) {
  // group by the STABLE source key; the display name comes along on the
  // entities, so a rename regroups nothing
  const sourceKeys = [...new Set(REGISTRY.map((e) => e.sourceKey || 'unknown'))]
  const multi = sourceKeys.length > 1
  return (
    <>
      {unmapped > 0 && (
        <div style={{ marginBottom: 14, background: '#fbf1dc', borderRadius: 4, padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#8a6d2e', lineHeight: 1.5 }}>
          {unmapped} {unmapped === 1 ? 'code' : 'codes'} from the extract {unmapped === 1 ? 'has' : 'have'} no label yet. Unlabeled codes are still targetable
          by raw value — a label just makes {unmapped === 1 ? 'it' : 'them'} readable everywhere: segments, playbooks, messages.
        </div>
      )}

      {sourceKeys.map((key) => {
        const meta = sourceMetaByKey(metaSources, key)
        const ents = REGISTRY.filter((e) => (e.sourceKey || 'unknown') === key)
        const displayName = ents[0]?.source || 'Unknown source'
        return (
          <div key={key} style={{ marginBottom: 18 }}>
            {multi && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '4px 0 8px' }}>
                <span style={{ fontSize: 14.5, fontWeight: 600, color: '#2e3d66' }}>{displayName}</span>
                <span style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 500, color: '#b1bccb' }} title="Stable source id — set at connection, never changes">{key}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#8a95a6' }}>
                  {meta
                    ? `as of ${meta.fileDate}${meta.ingestedAt ? ` · ingested ${new Date(meta.ingestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`
                    : key === 'src-pulsate-sdk' ? 'declared by the platform' : ''}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ents.map((e) => (
                <EntityCard
                  key={e.name}
                  entity={e}
                  codes={e.codeField === 'Loan Type' ? codes : null}
                  onMapCode={onMapCode}
                  onEditField={onEditField}
                  onEditEntityCategory={onEditEntityCategory}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* more vocabularies arrive as sources send code fields */}
      <div style={{ margin: '18px 0 8px', fontSize: 12, fontWeight: 600, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }}>
        Other vocabularies
      </div>
      <div style={{ background: '#fff', border: '1px dashed #d8e0ea', borderRadius: 4, padding: '22px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: '#1b3a63' }}>One ingested code field so far — Loan Type</div>
        <div style={{ margin: '5px auto 0', fontSize: 13.5, fontWeight: 600, color: '#8a95a6', maxWidth: 560, lineHeight: 1.5 }}>
          AUTO_LOAN carries attributes only — no code field to label. Event Name (App Events) is declared by the
          platform but has no codes yet. Every code field a source sends brings its own vocabulary here for labeling.
        </div>
      </div>
    </>
  )
}

function EntityCard({ entity: e, codes, onMapCode, onEditField, onEditEntityCategory }) {
  const recs = entityRecordCount(e.name)
  const hiddenCount = e.fields.filter((f) => f.hidden).length
  const humanizable = e.fields.filter(
    (f) => !f.hidden && f.role !== 'code' && f.label === f.name && humanizeFieldName(f.name) !== f.name
  )
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 4, overflow: 'hidden' }}>
      {/* entity header: raw name, category (editable), purpose, counts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '1px solid #edf1f6', background: '#fafbfd' }}>
        <ProductIcon size={14} stroke="#5a7db0" />
        <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1b3a63', fontFamily: rawLooking(e.name) ? mono : 'inherit' }}>{e.name}</span>
        {e.platform ? (
          <span style={{ fontSize: 10.5, fontWeight: 600, color: '#7a4fc0', background: '#efe8fb', padding: '2px 7px', borderRadius: 4 }}>platform</span>
        ) : (
          <select
            value={PULSATE_CATEGORIES.includes(e.category) ? e.category : ''}
            onChange={(ev) => onEditEntityCategory?.(e.name, ev.target.value || 'UNKNOWN')}
            style={{ ...selectStyle, padding: '4px 7px', fontSize: 12.5, width: 150 }}
            title="Pulsate category — groups this entity in the segment picker"
          >
            <option value="">Uncategorized</option>
            {PULSATE_CATEGORIES.map((k) => (
              <option key={k} value={k}>{categoryLabel(k)}</option>
            ))}
          </select>
        )}
        {/* only restrictions get a chip — usable-everywhere is the
            default and says nothing worth reading */}
        {e.purpose === 'segment' && (
          <span style={{ fontSize: 10.5, fontWeight: 600, color: '#5a7db0', background: '#e6effb', padding: '2px 7px', borderRadius: 4 }} title="Targetable in segments, but not available as personalization tokens in messages">
            segments only
          </span>
        )}
        {e.purpose === 'campaign' && (
          <span style={{ fontSize: 10.5, fontWeight: 600, color: '#5a7db0', background: '#e6effb', padding: '2px 7px', borderRadius: 4 }} title="Available as personalization tokens in messages, but not targetable in segments">
            messages only
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 600, color: recs ? '#4a6088' : '#8a95a6' }}>
          {recs ? `${fmt(recs)} records` : 'no records yet'}
          {hiddenCount > 0 && <span style={{ color: '#8a95a6' }}> · {hiddenCount} hidden</span>}
        </span>
        {humanizable.length > 0 && (
          <button
            onClick={() => humanizable.forEach((f) => onEditField?.(e.name, f.name, { label: humanizeFieldName(f.name) }))}
            style={{ flex: 'none', border: '1px solid #cfe1f6', background: '#eef5fc', color: '#1f4a86', borderRadius: 4, padding: '5px 11px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            title="Apply the suggested labels to every field still showing its raw name"
          >
            Humanize all ({humanizable.length})
          </button>
        )}
      </div>

      {/* field rows */}
      <div>
        {e.fields.map((f, i) => (
          <FieldRow key={f.name} entity={e} field={f} first={i === 0} onEditField={onEditField} />
        ))}
      </div>

      {/* the code vocabulary nested where it belongs */}
      {codes && <CodeTable codes={codes} onMapCode={onMapCode} />}
    </div>
  )
}

function FieldRow({ entity: e, field: f, first, onEditField }) {
  const [confirming, setConfirming] = useState(false)
  const noData = !e.platform && fieldValueCount(e.name, f.name) === 0
  const vals = f.type === 'string' && f.role !== 'code' && !e.platform ? distinctValues(e.name, f.name) : []
  const usage = fieldUsage(e.name, f.name)

  /* hidden fields sink: the row collapses to a quiet, dimmed line —
     still in the dictionary, gone from every picker */
  if (f.hidden) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px', borderTop: first ? 'none' : '1px solid #eef0fa', background: '#fafbfd' }}>
        <span style={{ width: 190, flex: 'none', fontFamily: mono, fontSize: 12, fontWeight: 500, color: '#b1bccb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {f.name}
        </span>
        <span style={{ width: 200, flex: 'none', fontSize: 12.5, fontWeight: 500, color: '#b1bccb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {f.label !== f.name ? f.label : ''}
        </span>
        <span style={{ flex: 'none', fontSize: 11, fontWeight: 600, color: '#8a95a6', background: '#e9ecf7', padding: '2px 8px', borderRadius: 4 }} title="Not offered when building segments or messages. Still ingested — values keep syncing.">
          hidden
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, color: '#b1bccb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {usage > 0 && `still used by ${usage} segment${usage === 1 ? '' : 's'}`}
        </span>
        <button
          onClick={() => onEditField?.(e.name, f.name, { hidden: false })}
          style={{ flex: 'none', border: '1px solid #cfe1f6', background: '#eef5fc', color: '#1f4a86', borderRadius: 4, padding: '4px 11px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Unhide
        </button>
      </div>
    )
  }

  return (
    <div
      onMouseLeave={() => setConfirming(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderTop: first ? 'none' : '1px solid #eef0fa' }}
    >
      <span style={{ width: 190, flex: 'none', fontFamily: mono, fontSize: 12, fontWeight: 500, color: '#8a95a6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`Raw field name from the source: ${f.name}`}>
        {f.name}
      </span>
      {e.platform ? (
        <span style={{ width: 200, flex: 'none', fontSize: 13, fontWeight: 600, color: '#2e3d66' }}>{f.label}</span>
      ) : (
        <input
          value={f.label === f.name ? '' : f.label}
          placeholder={humanizeFieldName(f.name)}
          onChange={(ev) => onEditField?.(e.name, f.name, { label: ev.target.value })}
          style={{ ...selectStyle, width: 200, flex: 'none', padding: '5px 8px', fontSize: 13 }}
          title="Label marketers see in the builder — blank keeps the raw name"
        />
      )}
      <span style={{ flex: 'none', fontSize: 11, fontWeight: 600, color: '#5a7db0', background: '#e6effb', padding: '2px 8px', borderRadius: 4 }}>{f.type}</span>
      {f.role === 'code' ? (
        <span style={{ flex: 'none', fontSize: 11, fontWeight: 600, color: '#7a4fc0', background: '#efe8fb', padding: '2px 8px', borderRadius: 4 }} title="The code role anchors this entity's vocabulary and can't be reassigned here">
          code
        </span>
      ) : e.platform ? (
        f.role && <span style={{ flex: 'none', fontSize: 11, fontWeight: 600, color: '#8a95a6', background: '#e9ecf7', padding: '2px 8px', borderRadius: 4 }}>{f.role}</span>
      ) : (
        <select
          value={f.role ?? ''}
          onChange={(ev) => onEditField?.(e.name, f.name, { role: ev.target.value || null })}
          style={{ ...selectStyle, padding: '4px 7px', fontSize: 12, width: 130, flex: 'none' }}
          title="Semantic role — lets playbooks and templates find this field by meaning"
        >
          <option value="">no role</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      )}
      <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, color: '#8a95a6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {vals.length > 0 && (
          <>observed: {vals.slice(0, 8).join(', ')}{vals.length > 8 ? ` +${vals.length - 8} more` : ''}</>
        )}
      </span>
      {noData && (
        <span style={{ flex: 'none', fontSize: 11, fontWeight: 600, color: '#8a6d2e', background: '#fbf1dc', padding: '2px 8px', borderRadius: 4 }} title="Declared by the source but no record carries a value yet">
          no data
        </span>
      )}
      {/* hide is a picker control: never for the code anchor or platform fields.
          Hiding a field a segment uses asks once, with the real count. */}
      {!e.platform && f.role !== 'code' && (
        confirming ? (
          <button
            onClick={() => { setConfirming(false); onEditField?.(e.name, f.name, { hidden: true }) }}
            title="Those segments keep evaluating and reading this field — it only leaves the pickers for new rules."
            style={{ flex: 'none', border: '1px solid #f0e3c0', background: '#fbf1dc', color: '#8a6d2e', borderRadius: 4, padding: '4px 11px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Hide anyway · in {usage} segment{usage === 1 ? '' : 's'}
          </button>
        ) : (
          <button
            onClick={() => (usage > 0 ? setConfirming(true) : onEditField?.(e.name, f.name, { hidden: true }))}
            title="Remove from segment and message pickers. Still ingested — unhide anytime."
            style={{ flex: 'none', border: 'none', background: 'transparent', color: '#8a95a6', borderRadius: 4, padding: '4px 8px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Hide
          </button>
        )
      )}
    </div>
  )
}

function CodeTable({ codes, onMapCode }) {
  const unused = codes.filter((c) => c.holders === 0).length
  return (
    <div style={{ borderTop: '1px solid #edf1f6' }}>
      <div style={{ padding: '9px 16px', background: '#fafbfd', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={sectionLabel}>Loan Type — code vocabulary</span>
        {unused > 0 && (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#8a6d2e', background: '#fbf1dc', padding: '2px 8px', borderRadius: 4 }}>
            {unused} unused
          </span>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr>
            {['Code', 'Source field', 'Records', 'Label — what marketers see', 'Category', 'Status'].map((h) => (
              <th key={h} style={{ ...sectionLabel, textAlign: 'left', padding: '8px 14px', borderBottom: '1px solid #edf1f6', background: '#fafbfd' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {codes.map((c) => {
            const mapped = codeMapped(c)
            return (
              <tr key={c.code} style={{ background: mapped ? '#fff' : '#fffdf5' }}>
                <td style={{ padding: '9px 14px', borderBottom: '1px solid #eef0fa' }}>
                  <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 500, color: '#2e3d66', background: '#e9ecf7', padding: '3px 8px', borderRadius: 4 }}>{c.code}</span>
                </td>
                <td style={{ padding: '9px 14px', borderBottom: '1px solid #eef0fa', fontFamily: mono, fontSize: 12, fontWeight: 600, color: '#8a95a6' }}>{c.rawCols}</td>
                <td style={{ padding: '9px 14px', borderBottom: '1px solid #eef0fa', fontWeight: 500, color: '#4a6088' }}>
                  {fmt(c.holders)}
                  {c.holders === 0 && (
                    <span style={{ marginLeft: 7, fontSize: 11, fontWeight: 600, color: '#8a6d2e', background: '#fbf1dc', padding: '2px 7px', borderRadius: 4 }} title="No record in the current extract carries this code">
                      unused
                    </span>
                  )}
                </td>
                <td style={{ padding: '9px 14px', borderBottom: '1px solid #eef0fa' }}>
                  <input
                    value={c.label}
                    placeholder="e.g. HSA Savings"
                    onChange={(e) => onMapCode(c.code, { label: e.target.value })}
                    style={{ ...selectStyle, width: 190 }}
                  />
                </td>
                <td style={{ padding: '9px 14px', borderBottom: '1px solid #eef0fa' }}>
                  <select
                    value={c.category ?? ''}
                    onChange={(e) => onMapCode(c.code, { category: e.target.value || null })}
                    style={{ ...selectStyle, width: 130 }}
                  >
                    <option value="">Optional…</option>
                    {PULSATE_CATEGORIES.map((k) => (
                      <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '9px 14px', borderBottom: '1px solid #eef0fa' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 4, color: mapped ? '#1f6f4a' : '#8a6d2e', background: mapped ? '#e2f4ea' : '#fbf1dc', whiteSpace: 'nowrap' }}>
                    {mapped ? 'Mapped' : 'Needs mapping'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── Migration preview: production's condition sources → the kernel ──
   Renders LEGACY_MIGRATION — a mapping plan observed from the production
   segment builder, not ingested data. */

const DISPOSITION_META = {
  migrate: { label: 'Becomes entity', fg: '#1f6f4a', bg: '#e2f4ea' },
  'campaign-artifact': { label: 'Campaign artifact — archive', fg: '#8a6d2e', bg: '#fbf1dc' },
  platform: { label: 'Platform', fg: '#7a4fc0', bg: '#efe8fb' },
}

function MigrationTab() {
  const tally = LEGACY_MIGRATION.reduce((m, r) => ((m[r.disposition] = (m[r.disposition] ?? 0) + 1), m), {})
  return (
    <>
      <div style={{ background: '#eef5fc', border: '1px solid #cfe1f6', borderRadius: 4, padding: '13px 16px', fontSize: 14, fontWeight: 500, color: '#1f4a86', lineHeight: 1.5, marginBottom: 12 }}>
        Mapping plan observed from the production segment builder (staging, Aug 2026). Nothing below is ingested —
        it shows the translation every legacy condition source gets in the entity kernel: real entities absorbed,
        campaign file-drops archived (their data gets a proper home), platform machinery left alone.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
        <Kpi big={String(tally.migrate ?? 0)} label="become real entities" />
        <Kpi big={String(tally['campaign-artifact'] ?? 0)} label="campaign artifacts — archived, data re-homed" />
        <Kpi big={String(tally.platform ?? 0)} label="platform machinery — unchanged" />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 4, overflow: 'hidden' }}>
        {LEGACY_MIGRATION.map((row, i) => {
          const d = DISPOSITION_META[row.disposition]
          return (
            <div key={row.legacyName} style={{ display: 'flex', gap: 16, padding: '13px 16px', borderTop: i ? '1px solid #eef0fa' : 'none', alignItems: 'flex-start' }}>
              {/* before — the raw production source */}
              <div style={{ width: 250, flex: 'none' }}>
                <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 500, color: '#a33c3c' }}>{row.legacyName}</div>
                {row.exampleFields.map((f) => (
                  <div key={f.raw} style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: '#c48a8a', marginTop: 3, overflowWrap: 'anywhere' }}>{f.raw}</div>
                ))}
              </div>
              <span style={{ color: '#c3ccd9', fontWeight: 600, flex: 'none', marginTop: 1 }}>→</span>
              {/* after — the kernel mapping */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  {row.cleanName && <span style={{ fontSize: 14, fontWeight: 600, color: '#2e3d66' }}>{row.cleanName}</span>}
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: '#5a7db0', background: '#e6effb', padding: '2px 7px', borderRadius: 4 }}>
                    {categoryLabel(row.category)}
                  </span>
                  {row.purpose === 'segment' && (
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: '#8a95a6', background: '#e9ecf7', padding: '2px 7px', borderRadius: 4 }}>segments only</span>
                  )}
                  {row.purpose === 'campaign' && (
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: '#8a95a6', background: '#e9ecf7', padding: '2px 7px', borderRadius: 4 }}>messages only</span>
                  )}
                </div>
                {row.exampleFields.length > 0 && (
                  <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {row.exampleFields.map((f) => (
                      <span key={f.raw} style={{ fontSize: 11.5, fontWeight: 500, color: '#4a6088', background: '#f4f7fb', border: '1px solid #e7edf5', padding: '2px 8px', borderRadius: 4 }}>
                        {f.label} · {f.type}{f.role ? ` · ${f.role}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {(row.note || row.exampleFields.some((f) => f.note)) && (
                  <div style={{ marginTop: 5, fontSize: 12, fontWeight: 600, color: '#8a6d2e', lineHeight: 1.45 }}>
                    {[row.note, ...row.exampleFields.filter((f) => f.note).map((f) => `${f.label}: ${f.note}`)].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              <span style={{ flex: 'none', fontSize: 11, fontWeight: 600, color: d.fg, background: d.bg, padding: '3px 9px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ── How it works ─────────────────────────────────────────────────── */

const PIPELINE = [
  { icon: RepeatIcon, title: 'Sources', caption: 'Files, cores, CRMs, SDK' },
  { icon: UsersIcon, title: 'Identity', caption: 'One member across systems' },
  { icon: ProductIcon, title: 'Registry', caption: 'Entities, fields, labeled codes' },
  { icon: SendIcon, title: 'Activation', caption: 'Segments, triggers, messages' },
]

function ModelTab() {
  const [mode, setMode] = useState('flat')
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, background: '#fff', border: '1px solid #e2e8f1', borderRadius: 4, padding: '12px 8px', marginBottom: 16 }}>
        {PIPELINE.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.title} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '2px 8px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 600, color: '#2e3d66' }}>
                  <span style={{ width: 26, height: 26, borderRadius: 4, background: '#e6effb', color: '#2f6fc4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={13} />
                  </span>
                  {s.title}
                </div>
                <div style={{ marginTop: 3, fontSize: 12, fontWeight: 600, color: '#8a95a6' }}>{s.caption}</div>
              </div>
              {i < PIPELINE.length - 1 && <span style={{ color: '#c3ccd9', fontWeight: 600, fontSize: 16 }}>→</span>}
            </div>
          )
        })}
      </div>

      <div style={{ margin: '0 0 16px', display: 'inline-flex', background: '#e4e9f1', borderRadius: 4, padding: 4, gap: 4 }}>
        <ModeTab on={mode === 'flat'} onClick={() => setMode('flat')} label="Today — flat file" />
        <ModeTab on={mode === 'relational'} onClick={() => setMode('relational')} label="Target — relational" />
      </div>
      {mode === 'flat' ? <FlatView /> : <RelationalView />}
    </>
  )
}

function FlatView() {
  // the REAL extract: 767 columns in VIP.LOAN, headers straight from the file
  const bound = new Set(['Account Number', 'Loan ID', 'Loan Type', 'Loan Balance', 'Payment', 'Due Date', 'Interest Rate', 'Maturity Date', 'Open Date'])
  return (
    <>
      <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ padding: '11px 16px', borderBottom: '1px solid #edf1f6', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 500, color: '#5a6b85' }}>{SYMITAR_STATS.fileDate.slice(5).replace('-', '') + SYMITAR_STATS.fileDate.slice(2, 4)}.VIP.LOAN</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#a33c3c', background: '#fbe3e3', padding: '3px 8px', borderRadius: 4 }}>
            {fmt(loanHeaders.length)} columns · one row per loan
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#8a95a6' }}>
            first {Math.min(24, loanHeaders.length)} of {fmt(loanHeaders.length)} real headers — row values withheld, they are real member data
          </span>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {loanHeaders.slice(0, 24).map((c) => (
            <span key={c} style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 500, padding: '4px 9px', borderRadius: 4, background: bound.has(c) ? '#e6effb' : '#e9ecf7', color: bound.has(c) ? '#1f4a86' : '#8a95a6', whiteSpace: 'nowrap' }}>
              {c}
            </span>
          ))}
          <span style={{ fontSize: 11.5, fontWeight: 500, padding: '4px 9px', color: '#b1bccb' }}>… +{fmt(loanHeaders.length - 24)} more</span>
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Problem title={`${fmt(loanHeaders.length)} columns, ${9} bound`}>
          The spec exports every core field. Only the highlighted columns carry segmentation value — the rest is noise the model has to shed.
        </Problem>
        <Problem title="Sentinels, not blanks">
          “--/--/----” means not set. {Math.round((100 * SYMITAR_STATS.maturityUnset) / SYMITAR_STATS.loans)}% of maturity dates in this file decode to unset — treat them as literal dates and every date rule breaks.
        </Problem>
        <Problem title="Relationships live in other files">
          Loans here, names and joint owners in VIP.NAME, keyed by account number. The flat file is already relational — the model has to make that explicit.
        </Problem>
      </div>
    </>
  )
}

// real field bindings from the ingest pipeline, plus the two decode rules.
// Field names stay the FI's own — ingestion never renames anything.
const MAPPINGS = [
  ['Loan Type', 'Loans record', 'Loan Type · code'],
  ['Loan Balance', 'Loans record', 'Loan Balance · currency'],
  ['Due Date', 'Loans record', 'Due Date · date'],
  ['--/--/---- (sentinel)', 'decoded on ingest', 'not set'],
  ['0010 (type code)', 'label translation', 'your dictionary label'],
]

function RelationalView() {
  // the real member with the most loans in the extract (synthetic display name)
  const m = showcaseMember()
  if (!m) return null
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 14, alignItems: 'start' }}>
        {/* member → products */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 4, padding: 16 }}>
          <span style={sectionLabel}>Member — from the extract</span>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#e2f4ea', color: '#1f6f4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14.5, fontWeight: 600 }}>
              {m.initials}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#2e3d66' }}>{m.name}</div>
              <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: '#b1bccb' }}>#{m.id} · holds {m.products.length} records · synthetic display name</div>
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {m.products.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, border: '1px solid #e7edf5', background: '#f7fafd', borderRadius: 4, padding: '8px 11px' }}>
                <ProductIcon size={14} stroke="#5a7db0" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1b3a63' }}>{p.label}</span>
                    <span style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 500, color: '#8a95a6', background: '#e9ecf7', padding: '2px 6px', borderRadius: 5 }}>{p.code}</span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#8a95a6', marginTop: 1 }}>{p.facts}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 500, color: '#1f6f4a', background: '#eef9f1', borderRadius: 4, padding: '7px 10px' }}>
            Another loan is just another record — no new columns, no new file format.
          </div>
        </div>

        {/* mapping */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 4, padding: 16 }}>
          <span style={sectionLabel}>Import mapping — raw columns → entity records</span>
          <p style={{ margin: '5px 0 10px', fontSize: 13.5, fontWeight: 600, color: '#8a95a6', lineHeight: 1.45 }}>
            Each FI’s columns bind once into typed entity fields, keeping the FI’s own names; codes get labels in the dictionary.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr>
                {['Raw column', 'Lands on', 'Typed field'].map((h) => (
                  <th key={h} style={{ ...sectionLabel, textAlign: 'left', padding: '7px 10px', borderBottom: '1px solid #edf1f6' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MAPPINGS.map((m, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #eef0fa', fontFamily: mono, fontSize: 12.5, fontWeight: 600, color: '#a33c3c' }}>{m[0]}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #eef0fa', fontWeight: 500, color: '#1b3a63' }}>{m[1]}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #eef0fa', fontWeight: 500, color: '#2f6fc4' }}>{m[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 14, background: '#eef5fc', border: '1px solid #cfe1f6', borderRadius: 4, padding: '13px 16px', fontSize: 14.5, fontWeight: 500, color: '#1f4a86', lineHeight: 1.5 }}>
        This is what makes one-rule targeting possible: “Any loan where payment due date is in the next 3 days” — across every loan a member holds, whatever the FI called the columns.
      </div>
    </>
  )
}

function Problem({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #f0d9d9', borderRadius: 4, padding: '12px 14px' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#a33c3c' }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: '#5a6b85', lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}
