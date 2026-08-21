import { useEffect, useState } from 'react'
import FlowCanvas from './components/FlowCanvas'
import EntryPanel from './components/EntryPanel'
import MessageSidebar from './components/MessageSidebar'
import AudienceLibrary from './components/AudienceLibrary'
import AudienceBuilder from './components/AudienceBuilder'
import DataModelView from './components/DataModelView'
import { seedAudiences, seedSymitarCodes, seedSources, codeMapped, setActiveCodeMap, setActiveSegments, hydrateDataset, setIngestMeta, symitarSource, evolveStyleSources, registryDateFields, gapAudienceRule, setFieldMeta, setEntityCategory, setSourceName, entityDef } from './data'
import { loadFromDb, persistCodeMapping, persistFieldMeta, persistEntityCategory, persistSourceName } from './dbClient'
import { ChevronLeftIcon, ChartIcon } from './icons'

export default function App() {
  const [view, setView] = useState('canvas') // 'canvas' | 'library' | 'data'
  const [editor, setEditor] = useState('entry') // canvas drawer: 'entry' | 'message' | null
  const [entry, setEntry] = useState({
    trigger: { type: 'audience', geoSel: {}, dateDays: 3, dateField: registryDateFields()[0]?.key ?? null },
    audienceId: null,
    exits: { goal: 'none', instanceExit: false, audienceExit: false },
    reenroll: 'off',
  })
  const [entrySaved, setEntrySaved] = useState(false)
  // the code map must be live BEFORE seeding — seeded audiences resolve
  // their category scopes through it
  const [productCodes, setProductCodes] = useState(() => {
    const codes = seedSymitarCodes()
    setActiveCodeMap(codes)
    return codes
  })
  const [audiences, setAudiences] = useState(seedAudiences)
  const [builderCtx, setBuilderCtx] = useState(null) // { audienceId: string|null, returnTo: 'library'|'entry', initialRule?: object }
  const [sources, setSources] = useState(seedSources)
  const [dataSource, setDataSource] = useState(null) // { kind: 'sqlite', fileDate } once hydrated
  const [metaSources, setMetaSources] = useState(null) // sources registry from the DB payload
  // dictionary edits mutate the module-level REGISTRY; this counter forces re-render
  const [, setRegistryVersion] = useState(0)

  // boot from the ingested SQLite kernel when available; the bundled
  // sanitized dataset stays as the fallback for clones without the files
  useEffect(() => {
    loadFromDb().then((p) => {
      if (!p) return
      hydrateDataset(p)
      setIngestMeta(p.meta ?? null)
      setProductCodes(p.codes)
      // source_def owns display names — the Symitar card adopts its
      // (possibly renamed) name from the payload's sources registry
      const sym = symitarSource(p.meta)
      const symEntry = (p.sources ?? []).find((s) => s.id === 'src-symitar')
      if (symEntry) sym.name = symEntry.name
      setSources([sym, ...evolveStyleSources(p.sources)])
      setMetaSources(p.sources ?? null)
      setDataSource({ kind: 'sqlite', fileDate: p.fileDate })
    })
  }, [])

  // keep the module-level map in sync so rule evaluation (reach,
  // drill-ins) resolves labels through the live catalog mappings
  setActiveCodeMap(productCodes)
  // saved segments are referencable from other segments' blocks
  setActiveSegments(audiences)
  const [freqCap, setFreqCap] = useState({ n: 1, per: 'day' })
  const [message, setMessage] = useState(null)
  const [showPerf, setShowPerf] = useState(false)

  const audience = audiences.find((a) => a.id === entry.audienceId) ?? null

  const selectAudience = (id) => {
    setEntry((e) => ({ ...e, audienceId: id }))
    setView('canvas')
    setEditor('entry')
  }

  const activateTemplate = (tpl) => {
    const id = `aud-${tpl.id}`
    setAudiences((prev) =>
      prev.some((a) => a.id === id)
        ? prev
        : [{ id, name: tpl.title, kind: tpl.kind, rule: tpl.rule ? structuredClone(tpl.rule) : null, users: tpl.users, usedIn: 0 }, ...prev]
    )
    selectAudience(id)
  }

  const upsertAudience = (aud) => {
    setAudiences((prev) => {
      const i = prev.findIndex((a) => a.id === aud.id)
      if (i < 0) return [aud, ...prev]
      const next = [...prev]
      next[i] = aud
      return next
    })
    if (builderCtx?.returnTo === 'entry') {
      setEntry((e) => ({ ...e, audienceId: aud.id }))
      setView('canvas')
      setEditor('entry')
    } else {
      setView('library')
    }
    setBuilderCtx(null)
  }

  return (
    <div
      style={{
        position: 'relative',
        width: 1440,
        height: 900,
        overflow: 'hidden',
        background: '#fff',
        fontFamily: "'Poppins', system-ui, sans-serif",
      }}
    >
      <AppHeader
        view={view}
        onNav={setView}
        showPerf={showPerf}
        onTogglePerf={setShowPerf}
        perfVisible={view === 'canvas'}
        dataBadge={productCodes.filter((c) => !codeMapped(c)).length || null}
        dataSource={dataSource}
      />

      <div style={{ position: 'absolute', top: 56, left: 0, right: 0, bottom: 0 }}>
        {view === 'canvas' && (
          <FlowCanvas
            entry={entry}
            audience={audience}
            audiences={audiences}
            message={message}
            showPerf={showPerf}
            sidebarOpen={editor !== null}
            onOpenEntry={() => setEditor('entry')}
            onOpenMessage={() => setEditor('message')}
          />
        )}
        {view === 'library' && (
          <AudienceLibrary
            audiences={audiences}
            selectedId={entry.audienceId}
            onUse={selectAudience}
            onNew={() => setBuilderCtx({ audienceId: null, returnTo: 'library' })}
            onEdit={(id) => setBuilderCtx({ audienceId: id, returnTo: 'library' })}
            onActivateTemplate={activateTemplate}
          />
        )}
        {view === 'data' && (
          <DataModelView
            codes={productCodes}
            onMapCode={(code, patch) =>
              setProductCodes((prev) =>
                prev.map((c) => {
                  if (c.code !== code) return c
                  const next = { ...c, ...patch }
                  if (dataSource?.kind === 'sqlite') persistCodeMapping(next)
                  return next
                })
              )
            }
            onCreateGapAudience={() =>
              setBuilderCtx({ audienceId: null, returnTo: 'library', initialRule: gapAudienceRule() })
            }
            sources={sources}
            metaSources={metaSources}
            onEditField={(entity, field, patch) => {
              setFieldMeta(entity, field, patch)
              // persist the field's full post-edit state — the API writes
              // both columns, so a partial patch must not null the other
              const f = entityDef(entity)?.fields.find((x) => x.name === field)
              if (dataSource?.kind === 'sqlite' && f) persistFieldMeta({ entity, field, label: f.label, role: f.role, hidden: f.hidden })
              setRegistryVersion((v) => v + 1)
            }}
            onEditEntityCategory={(entity, category) => {
              setEntityCategory(entity, category)
              if (dataSource?.kind === 'sqlite') persistEntityCategory({ entity, category })
              setRegistryVersion((v) => v + 1)
            }}
            onRenameSource={(key, name) => {
              const clean = (name ?? '').trim()
              if (!clean) return
              setSourceName(key, clean)
              setSources((prev) => prev.map((s) => (s.id === key ? { ...s, name: clean } : s)))
              setMetaSources((prev) => prev?.map((s) => (s.id === key ? { ...s, name: clean } : s)) ?? prev)
              if (dataSource?.kind === 'sqlite') persistSourceName({ key, name: clean })
              setRegistryVersion((v) => v + 1)
            }}
          />
        )}
      </div>

      {view === 'canvas' && editor === 'entry' && (
        <EntryPanel
          entry={entry}
          setEntry={setEntry}
          audience={audience}
          audiences={audiences}
          freqCap={freqCap}
          setFreqCap={setFreqCap}
          saved={entrySaved}
          onChooseAudience={() => {
            setEditor(null)
            setView('library')
          }}
          onEditAudience={() => setBuilderCtx({ audienceId: entry.audienceId, returnTo: 'entry' })}
          onClose={() => setEditor(null)}
          onSave={() => {
            setEditor(null)
            setEntrySaved(true)
          }}
        />
      )}
      {view === 'canvas' && editor === 'message' && (
        <MessageSidebar
          message={message}
          onClose={() => setEditor(null)}
          onSave={(m) => {
            setMessage(m)
            setEditor(null)
          }}
        />
      )}

      {builderCtx && (
        <AudienceBuilder
          audiences={audiences}
          audience={audiences.find((a) => a.id === builderCtx.audienceId) ?? null}
          initialRule={builderCtx.initialRule}
          onCancel={() => setBuilderCtx(null)}
          onSave={upsertAudience}
        />
      )}
    </div>
  )
}

function AppHeader({ view, onNav, showPerf, onTogglePerf, perfVisible, dataBadge, dataSource }) {
  const NAV = [
    { key: 'canvas', label: 'Flow' },
    { key: 'library', label: 'Segments' },
    { key: 'data', label: 'Data', badge: dataBadge },
  ]
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, zIndex: 10, borderBottom: '1px solid #edf1f6', boxSizing: 'border-box' }}>
      <button
        style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #d8e0ea', background: '#fff', color: '#2f6fc4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
      >
        <ChevronLeftIcon size={15} strokeWidth={2.4} />
      </button>
      <span style={{ fontSize: 17, fontWeight: 600, color: '#2e3d66', whiteSpace: 'nowrap' }}>Untitled automation</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#8a6d2e', background: '#fbf1dc', padding: '3px 10px', borderRadius: 4 }}>Draft</span>
      {dataSource?.kind === 'sqlite' && (
        <span title={`Evaluating against db/pulsate.db — ingested VIP extract, file date ${dataSource.fileDate}`} style={{ fontSize: 12, fontWeight: 600, color: '#1f6f4a', background: '#e2f4ea', padding: '3px 10px', borderRadius: 4, whiteSpace: 'nowrap' }}>
        SQLite · {dataSource.fileDate}
        </span>
      )}

      <div style={{ marginLeft: 18, display: 'flex', background: '#e9ecf7', borderRadius: 4, padding: 3, gap: 3 }}>
        {NAV.map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => onNav(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              border: 'none', borderRadius: 4, padding: '6px 14px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              ...(view === key
                ? { background: '#fff', color: '#2e3d66', boxShadow: '0 1px 3px rgba(20,34,60,.15)' }
                : { background: 'transparent', color: '#8a95a6' }),
            }}
          >
            {label}
            {badge != null && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#8a6d2e', background: '#fbf1dc', padding: '1px 6px', borderRadius: 4 }}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      {perfVisible && (
        <div style={{ marginLeft: 'auto', display: 'flex', background: '#e9ecf7', borderRadius: 4, padding: 3, gap: 3 }}>
          {[{ key: false, label: 'Build' }, { key: true, label: 'Performance' }].map(({ key, label }) => (
            <button
              key={label}
              onClick={() => onTogglePerf(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, border: 'none', borderRadius: 4, padding: '6px 12px',
                fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                ...(showPerf === key
                  ? { background: '#fff', color: '#2e3d66', boxShadow: '0 1px 3px rgba(20,34,60,.15)' }
                  : { background: 'transparent', color: '#8a95a6' }),
              }}
            >
              {key && <ChartIcon size={13} />}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
