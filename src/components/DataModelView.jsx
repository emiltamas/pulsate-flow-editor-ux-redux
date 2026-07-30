import { useState } from 'react'
import {
  FLAT_FILE_SAMPLE, FEED_FILES, DUE_DATE_GAP, PRODUCT_CATEGORIES, CATEGORY_ORDER,
  codeMapped, fmt,
} from '../data'
import { ProductIcon } from '../icons'

const sectionLabel = { fontSize: 11, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }
const mono = 'ui-monospace, Menlo, monospace'
const selectStyle = {
  boxSizing: 'border-box', border: '1px solid #d8e0ea', borderRadius: 9,
  padding: '7px 9px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#17335f',
  outline: 'none', background: '#fff',
}

/* The Data section is a working surface, not a diagram: marketers map the
   FI's product codes into the Pulsate-managed registry, watch feed health,
   and (in "How it works") see why the relational model matters. */
export default function DataModelView({ codes, onMapCode, onCreateGapAudience }) {
  const [tab, setTab] = useState('catalog')
  const unmapped = codes.filter((c) => !codeMapped(c)).length

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f4f6fa', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 32px 48px' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#17335f', letterSpacing: '-.3px' }}>Member product data</h1>
        <p style={{ margin: '5px 0 0', fontSize: 13.5, color: '#8a95a6', fontWeight: 500, maxWidth: 680 }}>
          Map your core’s product codes once — every audience, playbook and message reads from the result. Sample data is invented.
        </p>

        <div style={{ margin: '18px 0 20px', display: 'inline-flex', background: '#e4e9f1', borderRadius: 11, padding: 4, gap: 4 }}>
          <ModeTab on={tab === 'catalog'} onClick={() => setTab('catalog')} label="Product catalog" badge={unmapped || null} />
          <ModeTab on={tab === 'feeds'} onClick={() => setTab('feeds')} label="Feeds" />
          <ModeTab on={tab === 'model'} onClick={() => setTab('model')} label="How it works" />
        </div>

        {tab === 'catalog' && <CatalogTab codes={codes} onMapCode={onMapCode} unmapped={unmapped} />}
        {tab === 'feeds' && <FeedsTab onCreateGapAudience={onCreateGapAudience} />}
        {tab === 'model' && <ModelTab />}
      </div>
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

/* ── Product catalog ─────────────────────────────────────────────── */

function CatalogTab({ codes, onMapCode, unmapped }) {
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

      {/* the registry — the Pulsate-managed opinion */}
      <div style={{ marginTop: 14, background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, padding: 16 }}>
        <span style={sectionLabel}>The registry — managed by Pulsate</span>
        <p style={{ margin: '5px 0 12px', fontSize: 12.5, fontWeight: 600, color: '#8a95a6', lineHeight: 1.5, maxWidth: 720 }}>
          Categories and their fields are curated and versioned by Pulsate — they’re what operators, rule sentences, playbooks and
          date anchors bind to. Your labels above stay yours; the semantics underneath stay consistent for every FI.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
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
        </div>
      </div>
    </>
  )
}

/* ── Feeds ────────────────────────────────────────────────────────── */

function FeedsTab({ onCreateGapAudience }) {
  return (
    <>
      <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, overflow: 'hidden' }}>
        {FEED_FILES.map((f, i) => (
          <div key={f.file} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderTop: i ? '1px solid #f4f6fa' : 'none' }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 20, flex: 'none', color: f.status === 'ok' ? '#1f6f4a' : '#a33c3c', background: f.status === 'ok' ? '#e2f4ea' : '#fbe3e3' }}>
              {f.status === 'ok' ? 'Processed' : 'Partial'}
            </span>
            <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: '#17335f', flex: 'none' }}>{f.file}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8a95a6', flex: 'none' }}>{f.when}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#4a6088', flex: 'none' }}>{fmt(f.rows)} rows</span>
            {f.note && (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: f.status === 'ok' ? '#8a6d2e' : '#a33c3c', minWidth: 0 }}>{f.note}</span>
            )}
          </div>
        ))}
      </div>

      {/* data-quality gap → one-click audience */}
      <div style={{ marginTop: 14, background: '#fff', border: '1px solid #f0d9d9', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#a33c3c' }}>
            {DUE_DATE_GAP.field} is blank on {DUE_DATE_GAP.missingPct}% of loans (≈{fmt(DUE_DATE_GAP.count)} records)
          </div>
          <div style={{ marginTop: 4, fontSize: 12.5, fontWeight: 600, color: '#5a6b85', lineHeight: 1.5 }}>
            Blank values never silently match value comparisons — reminders simply skip these loans. But the gap itself is
            targetable: build the audience, and work with the core team to backfill.
          </div>
        </div>
        <button
          onClick={onCreateGapAudience}
          style={{ flex: 'none', border: 'none', background: '#2f5aa0', color: '#fff', borderRadius: 10, padding: '10px 18px', fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(47,90,160,.3)', whiteSpace: 'nowrap' }}
        >
          Create audience: loans with no due date
        </button>
      </div>
    </>
  )
}

/* ── How it works (flat vs relational story) ─────────────────────── */

function ModelTab() {
  const [mode, setMode] = useState('flat')
  return (
    <>
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
