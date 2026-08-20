import { GEOFENCES, registryDateFields, tagColor, fmt, trigLabel, ruleSentence, audienceReach, rulePlural } from '../data'
import {
  CloseIcon, CheckIcon, UsersIcon, PinIcon, DwellIcon, RepeatIcon,
  EnterIcon, ExitIcon, ProductIcon, PencilIcon,
} from '../icons'

const sectionLabel = { fontSize: 11, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }
const helperText = { margin: '4px 0 0', fontSize: 12.5, fontWeight: 600, color: '#8a95a6', lineHeight: 1.45 }

export const TRIGGER_META = {
  audience: { label: 'Audience joined', desc: 'Always on — members enter as soon as they match the audience.', Icon: UsersIcon },
  date: { label: 'Date anchor', desc: 'A set number of days before a date on a member’s product.', Icon: RepeatIcon },
  location: { label: 'Location event', desc: 'When a member enters, exits or dwells in a geofence.', Icon: PinIcon },
  schedule: { label: 'On a schedule', desc: 'Send once, or on a recurring schedule.', Icon: DwellIcon },
}
export const TRIGGER_ORDER = ['audience', 'date', 'location', 'schedule']

/* Anchor-able date fields come from the LIVE registry — every date field
   of every ingested entity, in the FI's own words. New entities add
   their date fields here automatically. */

export default function EntryPanel({
  entry, setEntry, audience, audiences,
  freqCap, setFreqCap, saved,
  onChooseAudience, onEditAudience, onClose, onSave,
}) {
  const { trigger } = entry
  const geoCount = Object.keys(trigger.geoSel).length
  const canSave = !!audience || (trigger.type === 'location' && geoCount > 0)

  const setTrigger = (patch) => setEntry((e) => ({ ...e, trigger: { ...e.trigger, ...patch } }))
  const toggleGeo = (i) =>
    setTrigger({
      geoSel: (() => {
        const next = { ...trigger.geoSel }
        if (next[i]) delete next[i]
        else next[i] = { trigger: 'enter', dwell: 5 }
        return next
      })(),
    })
  const setGeoTrigger = (i, t) =>
    setTrigger({ geoSel: { ...trigger.geoSel, [i]: { trigger: t, dwell: trigger.geoSel[i]?.dwell ?? 5 } } })
  const bumpGeoDwell = (i, d) => {
    const cur = trigger.geoSel[i] ?? { trigger: 'dwell', dwell: 5 }
    setTrigger({ geoSel: { ...trigger.geoSel, [i]: { ...cur, dwell: Math.max(1, Math.min(240, cur.dwell + d)) } } })
  }

  const reach = audience ? audienceReach(audience, audiences) : null

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(20,34,60,.34)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', zIndex: 20 }}
      />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 440, height: 900, background: '#fff', boxShadow: '-6px 0 28px rgba(20,34,60,.16)', display: 'flex', flexDirection: 'column', zIndex: 20 }}>

        {/* header */}
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #edf1f6' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: '#17335f', letterSpacing: '-.3px' }}>
                {saved ? 'Edit entry step' : 'Set up the entry step'}
              </h1>
              <p style={{ margin: '5px 0 0', fontSize: 13.5, color: '#8a95a6', fontWeight: 500 }}>
                Choose when members enter, and who is eligible.
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a95a6', padding: 2, display: 'flex' }}>
              <CloseIcon size={21} />
            </button>
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 0 20px' }}>

          {/* WHEN */}
          <div style={{ padding: '0 24px 20px' }}>
            <span style={sectionLabel}>When — entry trigger</span>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TRIGGER_ORDER.map((key) => {
                const meta = TRIGGER_META[key]
                const on = trigger.type === key
                return (
                  <div key={key}>
                    <div
                      onClick={() => setTrigger({ type: key })}
                      style={{
                        display: 'flex', gap: 11, padding: '11px 13px', borderRadius: 11, cursor: 'pointer',
                        border: `1px solid ${on ? '#cfe1f6' : '#e2e8f1'}`, background: on ? '#eef5fc' : '#fff',
                      }}
                    >
                      <span style={{ width: 30, height: 30, borderRadius: 8, flex: 'none', background: on ? '#d7e6f7' : '#eef1f6', color: on ? '#2f6fc4' : '#8a95a6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <meta.Icon size={15} />
                      </span>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#17335f' }}>{meta.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#8a95a6', marginTop: 1, lineHeight: 1.4 }}>{meta.desc}</div>
                      </div>
                    </div>
                    {on && key === 'date' && (
                      <div style={{ margin: '8px 0 2px 41px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 13, fontWeight: 700, color: '#1b3a63' }}>
                        <Stepper value={trigger.dateDays} onChange={(n) => setTrigger({ dateDays: n })} max={30} />
                        days before
                        <select
                          value={trigger.dateField}
                          onChange={(e) => setTrigger({ dateField: e.target.value })}
                          style={{ border: '1px solid #d8e0ea', borderRadius: 9, padding: '7px 10px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#17335f', outline: 'none', background: '#fff' }}
                        >
                          {registryDateFields().map((f) => <option key={f.key} value={f.key}>{f.label.toLowerCase()}</option>)}
                        </select>
                        <span style={{ width: '100%', fontSize: 12, fontWeight: 600, color: '#8a95a6' }}>
                          Recurring — members re-enter each time this date field rolls forward in your synced data.
                        </span>
                      </div>
                    )}
                    {on && key === 'location' && (
                      GEOFENCES.length === 0 ? (
                        <div style={{ margin: '8px 0 2px', border: '1px dashed #d8e0ea', borderRadius: 11, padding: '16px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1b3a63' }}>No geofences defined yet</div>
                          <div style={{ marginTop: 3, fontSize: 11.5, fontWeight: 600, color: '#8a95a6', lineHeight: 1.5 }}>
                            Draw branch, dealer or event zones in Geofences and they become entry triggers here.
                          </div>
                        </div>
                      ) : (
                        <div style={{ margin: '8px 0 2px', border: '1px solid #e2e8f1', borderRadius: 11, maxHeight: 250, overflowY: 'auto' }}>
                          {GEOFENCES.map((g, i) => (
                            <GeofenceRow
                              key={i}
                              geofence={g}
                              config={trigger.geoSel[i]}
                              onToggle={() => toggleGeo(i)}
                              onSetTrigger={(t) => setGeoTrigger(i, t)}
                              onBumpDwell={(d) => bumpGeoDwell(i, d)}
                            />
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* WHO */}
          <div style={{ padding: '0 24px 20px' }}>
            <span style={sectionLabel}>Who — audience</span>
            {audience ? (
              <div style={{ marginTop: 8, border: '1px solid #e2e8f1', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 800, color: '#17335f', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {audience.name}
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', background: tagColor(audience.kind), padding: '3px 8px', borderRadius: 20, flex: 'none' }}>
                      {audience.kind}
                    </span>
                  </div>
                  {audience.rule && (
                    <div style={{ marginTop: 4, fontSize: 12.5, fontWeight: 700, color: '#1f4a86', lineHeight: 1.45 }}>
                      {ruleSentence(audience.rule)}
                    </div>
                  )}
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#8a95a6' }}>
                    <UsersIcon size={13} />
                    ~{fmt(reach.members)} members
                    {reach.products !== null && ` · ${fmt(reach.products)} matching ${rulePlural(audience.rule)}`}
                  </div>
                </div>
                <div style={{ display: 'flex', borderTop: '1px solid #edf1f6' }}>
                  <button onClick={onChooseAudience} style={cardActionStyle}>Change</button>
                  {audience.rule && (
                    <button onClick={onEditAudience} style={{ ...cardActionStyle, borderLeft: '1px solid #edf1f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <PencilIcon size={13} /> Edit rules
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={onChooseAudience}
                style={{
                  marginTop: 8, width: '100%', boxSizing: 'border-box', padding: '18px 14px',
                  border: '1.5px dashed #c3ccd9', borderRadius: 12, background: 'transparent', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13.5, fontWeight: 800, color: '#2f6fc4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <ProductIcon size={15} />
                Choose an audience
              </button>
            )}
            {trigger.type === 'location' && !audience && (
              <p style={helperText}>No audience selected — every member who triggers the location event enters.</p>
            )}
          </div>

          {/* EXIT — explicit, never implicit */}
          <div style={{ padding: '0 24px 20px' }}>
            <span style={sectionLabel}>Exit — leaving the flow</span>
            <p style={helperText}>
              Members finish the flow once they enter — falling out of the entry audience never ejects them. Exits are armed explicitly.
            </p>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ border: '1px solid #e2e8f1', borderRadius: 11, padding: '11px 13px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#17335f' }}>Goal — exit as converted</div>
                <select
                  value={entry.exits.goal}
                  onChange={(e) => setEntry((s) => ({ ...s, exits: { ...s.exits, goal: e.target.value } }))}
                  style={{ marginTop: 7, width: '100%', boxSizing: 'border-box', border: '1px solid #d8e0ea', borderRadius: 9, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#17335f', outline: 'none', background: '#fff' }}
                >
                  <option value="none">No goal — run to the end</option>
                  <option value="engaged">Clicked any message in this flow</option>
                  <option value="field_change">An anchored date field advanced on the enrolling record</option>
                </select>
                {entry.exits.goal !== 'none' && (
                  <p style={helperText}>
                    Counted as a conversion in Performance — leaving as success.
                    {entry.exits.goal === 'field_change' && ' Sync-derived: inferred from the field changing between syncs, not from a payment event — Pulsate never sees payments.'}
                  </p>
                )}
              </div>

              <ExitToggle
                armed={entry.exits.instanceExit}
                onToggle={() => setEntry((s) => ({ ...s, exits: { ...s.exits, instanceExit: !s.exits.instanceExit } }))}
                title="Enrolling product no longer qualifies"
                desc="Instance-scoped — a member with two enrollments exits only the one whose record stopped matching the rule (balance reached zero)."
              />
              <ExitToggle
                armed={entry.exits.audienceExit}
                onToggle={() => setEntry((s) => ({ ...s, exits: { ...s.exits, audienceExit: !s.exits.audienceExit } }))}
                title="No longer matches the entry audience"
                desc="Re-checked continuously, including during waits."
                warning={entry.exits.audienceExit ? 'Rolling windows eject mid-flow: with “account created 0–7 days”, members leave on day 8 even between steps.' : null}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <span style={sectionLabel}>Re-enrollment</span>
              <div style={{ marginTop: 7, display: 'flex', background: '#eef1f6', borderRadius: 10, padding: 3, gap: 3 }}>
                {[{ k: 'off', label: 'Off' }, { k: 'once', label: 'Once ever' }, { k: 'per_event', label: 'Every qualifying event' }].map(({ k, label }) => {
                  const on = entry.reenroll === k
                  return (
                    <button
                      key={k}
                      onClick={() => setEntry((s) => ({ ...s, reenroll: k }))}
                      style={{
                        flex: 1, border: 'none', borderRadius: 8, padding: '8px 4px', fontFamily: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                        ...(on ? { background: '#fff', color: '#17335f', boxShadow: '0 1px 3px rgba(20,34,60,.15)' } : { background: 'transparent', color: '#5a6b85' }),
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <p style={helperText}>
                {entry.reenroll === 'per_event'
                  ? 'Right for recurring date anchors — each new due date enrolls again.'
                  : entry.reenroll === 'once'
                    ? 'Members can enter this flow only once, ever.'
                    : 'Members who exit cannot re-enter this flow.'}
              </p>
            </div>
          </div>

          {/* governance */}
          <div style={{ padding: '0 24px' }}>
            <span style={sectionLabel}>Governance</span>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 13, fontWeight: 700, color: '#1b3a63' }}>
              Send at most
              <Stepper value={freqCap.n} onChange={(n) => setFreqCap({ ...freqCap, n })} max={9} />
              product message{freqCap.n === 1 ? '' : 's'} per member per
              <select
                value={freqCap.per}
                onChange={(e) => setFreqCap({ ...freqCap, per: e.target.value })}
                style={{ border: '1px solid #d8e0ea', borderRadius: 9, padding: '7px 10px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#17335f', outline: 'none', background: '#fff' }}
              >
                <option value="day">day</option>
                <option value="week">week</option>
              </select>
            </div>
            <p style={helperText}>If two records qualify the same day, the closest anchor date sends first.</p>
          </div>
        </div>

        {/* footer */}
        <div style={{ borderTop: '1px solid #edf1f6', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#8a95a6', maxWidth: 220 }}>
            {audience
              ? `${TRIGGER_META[trigger.type].label} · ${audience.name}`
              : trigger.type === 'location' && geoCount
                ? `${geoCount} geofence${geoCount === 1 ? '' : 's'} · all members`
                : 'Choose an audience to continue'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, color: '#5a6b85', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={() => canSave && onSave()}
              style={{
                background: '#2f5aa0', border: 'none', borderRadius: 10, padding: '10px 24px', fontFamily: 'inherit',
                fontSize: 14.5, fontWeight: 800, color: '#fff', cursor: canSave ? 'pointer' : 'not-allowed',
                boxShadow: '0 2px 8px rgba(47,90,160,.3)', whiteSpace: 'nowrap', opacity: canSave ? 1 : 0.45,
              }}
            >
              {saved ? 'Save changes' : 'Add entry step'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function ExitToggle({ armed, onToggle, title, desc, warning }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', gap: 11, padding: '11px 13px', borderRadius: 11, cursor: 'pointer',
        border: `1px solid ${armed ? '#cfe1f6' : '#e2e8f1'}`, background: armed ? '#eef5fc' : '#fff',
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: 5, flex: 'none', marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${armed ? '#2f7fd6' : '#c3ccd9'}`, background: armed ? '#2f7fd6' : '#fff', boxSizing: 'border-box' }}>
        {armed && <CheckIcon size={10} stroke="#fff" />}
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#17335f' }}>{title}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#8a95a6', marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
        {warning && (
          <div style={{ marginTop: 7, fontSize: 11.5, fontWeight: 800, color: '#8a6d2e', background: '#fbf1dc', borderRadius: 7, padding: '5px 9px' }}>
            {warning}
          </div>
        )}
      </div>
    </div>
  )
}

const cardActionStyle = {
  flex: 1, border: 'none', background: '#fff', padding: '10px 0', fontFamily: 'inherit',
  fontSize: 13, fontWeight: 800, color: '#2f6fc4', cursor: 'pointer',
}

function GeofenceRow({ geofence, config, onToggle, onSetTrigger, onBumpDwell }) {
  const on = !!config
  const t = config?.trigger
  return (
    <div style={{ borderBottom: '1px solid #f4f6fa', background: on ? '#eef5fc' : '#fff' }}>
      <div className="row" onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer' }}>
        <span style={{ width: 18, height: 18, borderRadius: 5, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${on ? '#2f7fd6' : '#c3ccd9'}`, background: on ? '#2f7fd6' : '#fff', boxSizing: 'border-box' }}>
          {on && <CheckIcon size={10} stroke="#fff" />}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1b3a63' }}>{geofence.name}</div>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: on ? '#2f7fd6' : tagColor(geofence.group) }}>
            {on ? `Triggers when member ${trigLabel(t)}${t === 'dwell' ? ` ${config.dwell}m` : ''}` : geofence.group}
          </div>
        </div>
      </div>
      {on && (
        <div style={{ padding: '0 12px 10px 40px' }}>
          <div style={{ display: 'flex', background: '#e4ebf5', borderRadius: 9, padding: 3, gap: 3 }}>
            <TriggerButton active={t === 'enter'} onClick={() => onSetTrigger('enter')} icon={<EnterIcon size={13} />} label="Enters" />
            <TriggerButton active={t === 'exit'} onClick={() => onSetTrigger('exit')} icon={<ExitIcon size={13} />} label="Exits" />
            <TriggerButton active={t === 'dwell'} onClick={() => onSetTrigger('dwell')} icon={<DwellIcon size={13} />} label="Dwells" />
          </div>
          {t === 'dwell' && (
            <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#1f4a86' }}>
              Stays at least
              <Stepper value={config.dwell} onChange={(v) => onBumpDwell(v - config.dwell)} max={240} />
              minutes
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TriggerButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        border: 'none', borderRadius: 7, padding: '6px 4px', fontFamily: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer',
        ...(active
          ? { background: '#2f7fd6', color: '#fff', boxShadow: '0 1px 3px rgba(47,127,214,.4)' }
          : { background: 'transparent', color: '#5a6b85' }),
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function Stepper({ value, onChange, max = 9 }) {
  const btn = { width: 26, height: 28, border: 'none', background: '#fff', color: '#2f6fc4', fontSize: 16, fontWeight: 800, cursor: 'pointer', lineHeight: 1, padding: 0 }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', border: '1px solid #d8e0ea', borderRadius: 8, overflow: 'hidden' }}>
      <button onClick={(e) => { e.stopPropagation(); onChange(Math.max(1, value - 1)) }} style={btn}>−</button>
      <span style={{ minWidth: 26, textAlign: 'center', fontSize: 13.5, fontWeight: 800, color: '#17335f' }}>{value}</span>
      <button onClick={(e) => { e.stopPropagation(); onChange(Math.min(max, value + 1)) }} style={btn}>+</button>
    </span>
  )
}
