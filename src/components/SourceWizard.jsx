import { useState } from 'react'
import { WIZARD_FILE, wizardTargetOptions, memberProducts, productFactline, fmt } from '../data'
import { CloseIcon, CheckIcon, ProductIcon } from '../icons'

const sectionLabel = { fontSize: 11, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }
const mono = 'ui-monospace, Menlo, monospace'
const selectStyle = {
  boxSizing: 'border-box', border: '1px solid #d8e0ea', borderRadius: 9,
  padding: '7px 9px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#17335f',
  outline: 'none', background: '#fff',
}

const STEPS = ['File', 'Map columns', 'Preview', 'Activate']

/* Self-serve import: the high-touch onboarding flow turned into product.
   Auto-mapping works because the registry is a known target; PII is
   excluded by default; nothing commits without a dry-run preview. */
export default function SourceWizard({ onCancel, onFinish }) {
  const [step, setStep] = useState(0)
  const [columns, setColumns] = useState(WIZARD_FILE.columns)

  const unmappedLeft = columns.filter((c) => c.confidence === 'unmapped').length
  const mappedCount = columns.filter((c) => c.confidence !== 'pii' && c.target).length
  const canContinue = step !== 1 || unmappedLeft === 0

  const resolveColumn = (col, target) =>
    setColumns((prev) => prev.map((c) => (c.col === col ? { ...c, target, confidence: 'manual' } : c)))

  const finish = () =>
    onFinish({
      id: `src-upload-${Date.now()}`,
      name: WIZARD_FILE.name,
      type: 'file',
      cadence: 'One-off upload',
      records: `${fmt(WIZARD_FILE.rows)} rows`,
      identity: 'Member number',
      fields: mappedCount,
      status: 'healthy',
      note: `${WIZARD_FILE.preview.newCodes.length} new product codes discovered — map them in the catalog`,
    })

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 40, display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ height: 62, borderBottom: '1px solid #edf1f6', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 14, flex: 'none' }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a95a6', padding: 2, display: 'flex' }}>
          <CloseIcon size={20} />
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#17335f', letterSpacing: '-.3px' }}>Add a source — file upload</h1>
        <div style={{ marginLeft: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: i === step ? '#17335f' : i < step ? '#1f6f4a' : '#b1bccb' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, background: i < step ? '#e2f4ea' : i === step ? '#17335f' : '#eef1f6', color: i < step ? '#1f6f4a' : i === step ? '#fff' : '#8a95a6' }}>
                  {i < step ? <CheckIcon size={9} stroke="#1f6f4a" /> : i + 1}
                </span>
                {s}
              </span>
              {i < STEPS.length - 1 && <span style={{ width: 18, height: 1, background: '#dbe3ee' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '26px 36px 40px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {step === 0 && <StepFile />}
          {step === 1 && <StepMap columns={columns} onResolve={resolveColumn} unmappedLeft={unmappedLeft} />}
          {step === 2 && <StepPreview />}
          {step === 3 && <StepActivate mappedCount={mappedCount} />}
        </div>
      </div>

      {/* footer */}
      <div style={{ borderTop: '1px solid #edf1f6', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#8a95a6' }}>
          {step === 1 && unmappedLeft > 0
            ? `${unmappedLeft} column${unmappedLeft === 1 ? '' : 's'} still need${unmappedLeft === 1 ? 's' : ''} a target`
            : 'Nothing is written until you activate.'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#5a6b85', cursor: 'pointer' }}>
              Back
            </button>
          )}
          <button
            onClick={() => (step < 3 ? canContinue && setStep(step + 1) : finish())}
            style={{
              background: '#2f5aa0', border: 'none', borderRadius: 10, padding: '10px 24px', fontFamily: 'inherit',
              fontSize: 14, fontWeight: 800, color: '#fff', cursor: canContinue ? 'pointer' : 'not-allowed',
              boxShadow: '0 2px 8px rgba(47,90,160,.3)', opacity: canContinue ? 1 : 0.45, whiteSpace: 'nowrap',
            }}
          >
            {step < 3 ? 'Continue' : 'Activate source'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StepFile() {
  return (
    <>
      <span style={sectionLabel}>File</span>
      <div style={{ marginTop: 10, border: '2px dashed #c3ccd9', borderRadius: 14, padding: '34px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#17335f' }}>Drop a CSV or SFTP export here</div>
        <div style={{ marginTop: 4, fontSize: 12.5, fontWeight: 600, color: '#8a95a6' }}>
          Core extracts, CRM exports, one-off lists — we’ll detect the columns.
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, background: '#f7fafd', border: '1px solid #cfe1f6', borderRadius: 12, padding: '12px 16px' }}>
        <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 700, color: '#17335f' }}>{WIZARD_FILE.name}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#8a95a6' }}>{WIZARD_FILE.size} · {fmt(WIZARD_FILE.rows)} rows · {WIZARD_FILE.columns.length} columns detected</span>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 800, color: '#1f6f4a', background: '#e2f4ea', padding: '3px 9px', borderRadius: 20 }}>Ready</span>
      </div>
    </>
  )
}

function StepMap({ columns, onResolve, unmappedLeft }) {
  return (
    <>
      {/* imports land in an entity class — detection picks, you confirm */}
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={sectionLabel}>Destination</span>
        {['Products', 'Offers', 'Member attributes'].map((d) => (
          <span
            key={d}
            style={{
              fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 20,
              ...(d === 'Products'
                ? { background: '#e6effb', color: '#1f4a86', border: '1px solid #cfe1f6' }
                : { background: '#fff', color: '#b1bccb', border: '1px solid #e2e8f1' }),
            }}
          >
            {d}
          </span>
        ))}
        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#8a95a6' }}>detected from the column shape</span>
      </div>
      <span style={sectionLabel}>Map columns → registry</span>
      <p style={{ margin: '5px 0 12px', fontSize: 12.5, fontWeight: 600, color: '#8a95a6', lineHeight: 1.5 }}>
        Auto-mapping works because the target schema is known — confirm the suggestions, resolve the rest.
        {unmappedLeft === 0 && ' All columns mapped.'}
      </p>
      <div style={{ background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Column', 'Sample', 'Maps to', 'Status'].map((h) => (
                <th key={h} style={{ ...sectionLabel, textAlign: 'left', padding: '9px 14px', borderBottom: '1px solid #edf1f6', background: '#fafbfd' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((c) => (
              <tr key={c.col} style={{ background: c.confidence === 'pii' ? '#fff8f8' : c.confidence === 'unmapped' ? '#fffdf5' : '#fff' }}>
                <td style={{ padding: '8px 14px', borderBottom: '1px solid #f4f6fa', fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: '#17335f' }}>{c.col}</td>
                <td style={{ padding: '8px 14px', borderBottom: '1px solid #f4f6fa', fontFamily: mono, fontSize: 11.5, fontWeight: 600, color: '#8a95a6' }}>{c.sample}</td>
                <td style={{ padding: '8px 14px', borderBottom: '1px solid #f4f6fa' }}>
                  {c.confidence === 'pii' ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#a33c3c' }}>Not imported</span>
                  ) : c.confidence === 'unmapped' ? (
                    <select value="" onChange={(e) => onResolve(c.col, e.target.value)} style={{ ...selectStyle, width: 230 }}>
                      <option value="" disabled>Choose a target…</option>
                      {wizardTargetOptions().map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1b3a63' }}>{c.target}</span>
                  )}
                </td>
                <td style={{ padding: '8px 14px', borderBottom: '1px solid #f4f6fa' }}>
                  <StatusChip confidence={c.confidence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#a33c3c', background: '#fbe3e3', borderRadius: 9, padding: '8px 12px', display: 'inline-block' }}>
        SSN looks like personal identifying data — excluded by default and never stored.
      </div>
    </>
  )
}

function StatusChip({ confidence }) {
  const map = {
    auto: { label: 'Auto-mapped', fg: '#1f6f4a', bg: '#e2f4ea' },
    suggested: { label: 'Suggested', fg: '#1f4a86', bg: '#e6effb' },
    manual: { label: 'Mapped', fg: '#1f6f4a', bg: '#e2f4ea' },
    unmapped: { label: 'Needs mapping', fg: '#8a6d2e', bg: '#fbf1dc' },
    pii: { label: 'PII — excluded', fg: '#a33c3c', bg: '#fbe3e3' },
  }
  const m = map[confidence]
  return <span style={{ fontSize: 10.5, fontWeight: 800, color: m.fg, background: m.bg, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>{m.label}</span>
}

function StepPreview() {
  const { matched, unmatched, newCodes } = WIZARD_FILE.preview
  const sample = memberProducts('Amara Okafor#100482').slice(0, 3)
  return (
    <>
      <span style={sectionLabel}>Dry run — nothing written yet</span>
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Stat big={fmt(matched)} label="members matched by member number" good />
        <Stat big={fmt(unmatched)} label="rows with no matching member" warn />
        <Stat big={String(newCodes.length)} label={`new product codes — ${newCodes.join(', ')}`} warn />
      </div>
      <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, padding: 16 }}>
        <span style={sectionLabel}>What one row becomes</span>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2f4ea', color: '#1f6f4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>AO</div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#17335f' }}>Amara Okafor <span style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 600, color: '#b1bccb' }}>#100482</span></div>
        </div>
        <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {sample.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#5a6b85' }}>
              <ProductIcon size={12} stroke="#5a7db0" />
              <span style={{ color: '#1b3a63', fontWeight: 800 }}>{p.label}</span>
              {productFactline(p)}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function Stat({ big, label, good, warn }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${good ? '#dcefe3' : '#f4e3c0'}`, borderRadius: 12, padding: '13px 15px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: good ? '#1f6f4a' : '#8a6d2e', letterSpacing: '-.4px' }}>{big}</div>
      <div style={{ marginTop: 2, fontSize: 11.5, fontWeight: 600, color: '#5a6b85', lineHeight: 1.4 }}>{label}</div>
    </div>
  )
}

function StepActivate({ mappedCount }) {
  return (
    <>
      <span style={sectionLabel}>Activate</span>
      <div style={{ marginTop: 10, background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, padding: 18 }}>
        {[
          [`${mappedCount} columns mapped into the registry`, true],
          ['PII column excluded — never stored', true],
          [`${fmt(WIZARD_FILE.preview.matched)} members will be updated`, true],
          [`${WIZARD_FILE.preview.newCodes.length} new product codes will appear in the catalog as a mapping task`, false],
        ].map(([text, ok], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', fontSize: 13, fontWeight: 700, color: '#1b3a63' }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ok ? '#e2f4ea' : '#fbf1dc' }}>
              <CheckIcon size={10} stroke={ok ? '#1f6f4a' : '#8a6d2e'} />
            </span>
            {text}
          </div>
        ))}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 12.5, fontWeight: 600, color: '#8a95a6', lineHeight: 1.5 }}>
        Activating adds this file as a source. Imports are versioned — you can review or roll back any run from the source’s history.
      </p>
    </>
  )
}
