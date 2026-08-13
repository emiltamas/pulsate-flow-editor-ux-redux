import { useState } from 'react'
import { SYMITAR_STATS, fmt } from '../data'
import { CloseIcon, CheckIcon } from '../icons'

const sectionLabel = { fontSize: 11, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }
const mono = 'ui-monospace, Menlo, monospace'

const STEPS = ['Install spec', 'Field binding', 'Dry run', 'Go live']

const RECORD_TYPES = ['NAME', 'SHARE', 'LOAN', 'CARD', 'EXTLOAN', 'ACCT']

const LOAN_BOUND = ['Account Number (hashed)', 'Loan ID', 'Loan Type', 'Loan Balance', 'Payment', 'Due Date', 'Interest Rate', 'Maturity Date', 'Open Date', 'Close Date', 'Charge-off Date']
const NAME_BOUND = ['Account Number (hashed)', 'Name Type', 'E-Mail (presence only)', 'Mobile (presence only)']
const PII_EXCLUDED = ['SSN/TIN', 'Birth Date', 'Mother’s Maiden Name', 'License', 'Street / City / Zip']

/* Symitar onboarding, end to end: install the PowerOn spec → zero-touch
   field binding (Pulsate wrote the spec, so Pulsate ships the mapping) →
   dry run on the real file → the only human task is code mapping. */
export default function SymitarConnect({ onClose, onGoCatalog }) {
  const [step, setStep] = useState(0)
  const s = SYMITAR_STATS

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 40, display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ height: 62, borderBottom: '1px solid #edf1f6', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 14, flex: 'none' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a95a6', padding: 2, display: 'flex' }}>
          <CloseIcon size={20} />
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#17335f', letterSpacing: '-.3px' }}>Connect Symitar — Standard Batch Extract v1.3</h1>
        <div style={{ marginLeft: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          {STEPS.map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: i === step ? '#17335f' : i < step ? '#1f6f4a' : '#b1bccb' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, background: i < step ? '#e2f4ea' : i === step ? '#17335f' : '#eef1f6', color: i === step ? '#fff' : '#8a95a6' }}>
                  {i < step ? <CheckIcon size={9} stroke="#1f6f4a" /> : i + 1}
                </span>
                {label}
              </span>
              {i < STEPS.length - 1 && <span style={{ width: 18, height: 1, background: '#dbe3ee' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '26px 36px 40px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {step === 0 && (
            <>
              <span style={sectionLabel}>Install the extract on your core</span>
              <p style={{ margin: '6px 0 14px', fontSize: 13, fontWeight: 600, color: '#5a6b85', lineHeight: 1.55, maxWidth: 640 }}>
                Your Symitar administrator installs Pulsate’s PowerOn specfiles and schedules the nightly job —
                a routine vendor install. Because Pulsate wrote the spec, <b>no field mapping will be needed</b>.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {RECORD_TYPES.map((t) => (
                  <div key={t} style={{ border: '1px solid #e7edf5', background: '#f7fafd', borderRadius: 11, padding: '12px 14px' }}>
                    <div style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 700, color: '#17335f' }}>VIP.{t}.EXTRACT</div>
                    <div style={{ marginTop: 2, fontSize: 11, fontWeight: 600, color: '#8a95a6' }}>PowerOn specfile + job file</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, background: '#f7fafd', border: '1px solid #cfe1f6', borderRadius: 12, padding: '12px 16px' }}>
                <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: '#17335f' }}>sftp://pulsate/…/inbound</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#8a95a6' }}>Nightly · 04:00 local · pipe-delimited, one row per record</span>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <span style={sectionLabel}>Field binding — zero-touch</span>
              <p style={{ margin: '6px 0 14px', fontSize: 13, fontWeight: 600, color: '#5a6b85', lineHeight: 1.55, maxWidth: 640 }}>
                The spec is the mapping. Columns bind to the registry automatically; you’ll never see a mapping screen for this source.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ border: '1px solid #e2e8f1', background: '#fff', borderRadius: 12, padding: '13px 15px' }}>
                  <div style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 700, color: '#17335f' }}>VIP.LOAN</div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#8a95a6', margin: '2px 0 8px' }}>{fmt(s.loanCols)} columns → {LOAN_BOUND.length} bound</div>
                  {LOAN_BOUND.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#1b3a63', padding: '2px 0' }}>
                      <CheckIcon size={10} stroke="#1f6f4a" /> {f}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ border: '1px solid #e2e8f1', background: '#fff', borderRadius: 12, padding: '13px 15px' }}>
                    <div style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 700, color: '#17335f' }}>VIP.NAME</div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: '#8a95a6', margin: '2px 0 8px' }}>{fmt(s.nameCols)} columns → {NAME_BOUND.length} bound</div>
                    {NAME_BOUND.map((f) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#1b3a63', padding: '2px 0' }}>
                        <CheckIcon size={10} stroke="#1f6f4a" /> {f}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, border: '1px solid #f0d9d9', background: '#fff8f8', borderRadius: 12, padding: '13px 15px' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#a33c3c', textTransform: 'uppercase', letterSpacing: '.5px' }}>Excluded — never stored</div>
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {PII_EXCLUDED.map((f) => (
                        <span key={f} style={{ fontSize: 11.5, fontWeight: 700, color: '#a33c3c', background: '#fbe3e3', padding: '3px 9px', borderRadius: 20 }}>{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <span style={sectionLabel}>Dry run — last night’s files, nothing written</span>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <Stat big={fmt(s.accounts)} label="members found" good />
                <Stat big={fmt(s.loans)} label={`loans across ${fmt(s.loanAccounts)} members`} good />
                <Stat big={`${Math.round((100 * s.multiLoanAccounts) / s.loanAccounts)}%`} label={`of borrowers hold 2+ loans (max ${s.maxLoans})`} good />
                <Stat big={String(Object.keys(s.typeCounts).length)} label="loan type codes discovered — need labels" warn />
                <Stat big={`${Math.round((100 * s.duePast) / s.loans)}%`} label="of due dates are in the past — check extract schedule" warn />
                <Stat big={`${Math.round((100 * s.maturityUnset) / s.loans)}%`} label="of loans have no maturity date on file (sentinels decoded)" warn />
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 12.5, fontWeight: 600, color: '#8a95a6', lineHeight: 1.5 }}>
                Join integrity: every loan account matched a member record. Contactability: e-mail {s.emailPct}% · mobile {s.mobilePct}% —
                worth a data-quality audience of its own.
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <span style={sectionLabel}>Go live</span>
              <div style={{ marginTop: 10, background: '#fff', border: '1px solid #e2e8f1', borderRadius: 14, padding: 18 }}>
                {[
                  'Nightly sync scheduled — freshness visible on the Sources page',
                  'Fields bound by spec — zero mapping to maintain',
                  'PII excluded at the boundary — never stored',
                  `One task remains: give the ${Object.keys(s.typeCounts).length} loan type codes your own labels`,
                ].map((text, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', fontSize: 13, fontWeight: 700, color: '#1b3a63' }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 3 ? '#fbf1dc' : '#e2f4ea' }}>
                      <CheckIcon size={10} stroke={i === 3 ? '#8a6d2e' : '#1f6f4a'} />
                    </span>
                    {text}
                  </div>
                ))}
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 12.5, fontWeight: 600, color: '#8a95a6' }}>
                Map the codes and every audience, playbook and message can target them — usually a ten-minute task.
              </p>
            </>
          )}
        </div>
      </div>

      {/* footer */}
      <div style={{ borderTop: '1px solid #edf1f6', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#8a95a6' }}>
          Standard Batch Extract v1.3 · file {s.fileDate}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#5a6b85', cursor: 'pointer' }}>
              Back
            </button>
          )}
          <button
            onClick={() => (step < 3 ? setStep(step + 1) : onGoCatalog())}
            style={{
              background: '#2f5aa0', border: 'none', borderRadius: 10, padding: '10px 24px', fontFamily: 'inherit',
              fontSize: 14, fontWeight: 800, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(47,90,160,.3)', whiteSpace: 'nowrap',
            }}
          >
            {step < 3 ? 'Continue' : 'Map product codes'}
          </button>
        </div>
      </div>
    </div>
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
