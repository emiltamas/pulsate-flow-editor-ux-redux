import { useState } from 'react'
import { CHANNELS, CHANNEL_ORDER } from '../data'
import {
  CloseIcon, CheckIcon, ChevronUpIcon, ChevronDownIcon,
  BellIcon, SmartphoneIcon, FeedIcon, ImageIcon,
} from '../icons'

const CHANNEL_ICONS = { push: BellIcon, inapp: SmartphoneIcon, feed: FeedIcon }

const EMPTY_DRAFT = { name: '', channels: [], title: '', body: '', cta: '', skip: 'always' }

const sectionLabel = { fontSize: 11, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }
const helperText = { margin: '4px 0 0', fontSize: 12.5, fontWeight: 600, color: '#8a95a6', lineHeight: 1.45 }
const inputStyle = {
  width: '100%', boxSizing: 'border-box', border: '1px solid #d8e0ea', borderRadius: 10,
  padding: '10px 12px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#17335f',
  outline: 'none', background: '#fff', resize: 'none',
}

export default function MessageSidebar({ message, onClose, onSave }) {
  const isNew = !message
  const [draft, setDraft] = useState(message ?? EMPTY_DRAFT)
  const [previewCh, setPreviewCh] = useState(message?.channels[0]?.type ?? null)

  const patch = (p) => setDraft((d) => ({ ...d, ...p }))

  const addChannel = (type) => {
    patch({ channels: [...draft.channels, { type, feedCard: false }] })
    setPreviewCh(type)
  }
  const removeChannel = (type) => {
    const next = draft.channels.filter((c) => c.type !== type)
    patch({ channels: next })
    if (previewCh === type) setPreviewCh(next[0]?.type ?? null)
  }
  const moveChannel = (type, dir) => {
    const i = draft.channels.findIndex((c) => c.type === type)
    const j = i + dir
    if (j < 0 || j >= draft.channels.length) return
    const next = [...draft.channels]
    ;[next[i], next[j]] = [next[j], next[i]]
    patch({ channels: next })
  }
  const toggleFeedCard = (type) =>
    patch({ channels: draft.channels.map((c) => (c.type === type ? { ...c, feedCard: !c.feedCard } : c)) })

  const unused = CHANNEL_ORDER.filter((t) => !draft.channels.some((c) => c.type === t))
  const canSave = draft.channels.length > 0

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
                {isNew ? 'Create a message' : 'Edit message'}
              </h1>
              <p style={{ margin: '5px 0 0', fontSize: 13.5, color: '#8a95a6', fontWeight: 500 }}>
                Write it once — it’s delivered through the first channel that reaches each member.
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a95a6', padding: 2, display: 'flex' }}>
              <CloseIcon size={21} />
            </button>
          </div>
        </div>

        {/* scrollable body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 0 20px' }}>

          {/* name */}
          <div style={{ padding: '0 24px 18px' }}>
            <Field
              label="Message name"
              value={draft.name}
              onChange={(v) => patch({ name: v })}
              max={64}
              placeholder="e.g. Welcome day 1"
            />
          </div>

          {/* preview */}
          <div style={{ margin: '0 24px 20px', borderRadius: 13, background: 'linear-gradient(135deg,#17335f,#2f5aa0)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ ...sectionLabel, color: 'rgba(255,255,255,.75)' }}>Preview</span>
              {draft.channels.length > 0 && (
                <div style={{ display: 'flex', gap: 5 }}>
                  {draft.channels.map((c) => (
                    <button
                      key={c.type}
                      onClick={() => setPreviewCh(c.type)}
                      style={{
                        padding: '4px 9px', borderRadius: 7, border: 'none', fontFamily: 'inherit', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                        background: previewCh === c.type ? '#fff' : 'rgba(255,255,255,.18)',
                        color: previewCh === c.type ? '#17335f' : 'rgba(255,255,255,.85)',
                      }}
                    >
                      {CHANNELS[c.type].short}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Preview channel={previewCh} draft={draft} />
          </div>

          {/* delivery order */}
          <div style={{ padding: '0 24px 20px' }}>
            <span style={sectionLabel}>Delivery order</span>
            <p style={helperText}>Tried top-down — each member gets the message through the first channel that reaches them.</p>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {draft.channels.map((c, i) => (
                <ChannelRow
                  key={c.type}
                  channel={c}
                  index={i}
                  count={draft.channels.length}
                  active={previewCh === c.type}
                  onSelect={() => setPreviewCh(c.type)}
                  onMove={(dir) => moveChannel(c.type, dir)}
                  onRemove={() => removeChannel(c.type)}
                  onToggleFeed={() => toggleFeedCard(c.type)}
                />
              ))}
              {unused.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {unused.map((t) => {
                    const Icon = CHANNEL_ICONS[t]
                    return (
                      <button
                        key={t}
                        onClick={() => addChannel(t)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 13px',
                          border: '1.5px dashed #c3ccd9', borderRadius: 10, background: 'transparent',
                          color: '#4a6088', fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                        }}
                      >
                        <Icon size={14} />
                        {`Add ${CHANNELS[t].short.toLowerCase() === 'in-app' ? 'in-app' : CHANNELS[t].short.toLowerCase()}`}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* content */}
          <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <span style={sectionLabel}>Content</span>
              <p style={helperText}>Shared across channels — the preview above updates as you type.</p>
            </div>
            <Field label="Title" value={draft.title} onChange={(v) => patch({ title: v })} max={48} placeholder="Grab your users’ attention" />
            <Field label="Text" value={draft.body} onChange={(v) => patch({ body: v })} max={140} placeholder="Add 1–2 lines that make this worth a tap." textarea />
            <Field label="Button label" value={draft.cta} onChange={(v) => patch({ cta: v })} max={24} placeholder="Open app" />
          </div>

          {/* skip conditions */}
          <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={sectionLabel}>Who gets it</span>
            <SkipOption
              selected={draft.skip === 'always'}
              onSelect={() => patch({ skip: 'always' })}
              title="Always send"
              desc="Every member who reaches this step gets the message."
            />
            <SkipOption
              selected={draft.skip === 'conditional'}
              onSelect={() => patch({ skip: 'conditional' })}
              title="Skip if conditions are met"
              desc="Matching members pass straight to the next step without it."
              note={draft.skip === 'conditional' ? 'Condition builder is coming next — saved as a placeholder for now.' : null}
            />
          </div>
        </div>

        {/* footer */}
        <div style={{ borderTop: '1px solid #edf1f6', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#8a95a6' }}>
            {canSave
              ? `Delivers via ${draft.channels.map((c) => CHANNELS[c.type].short).join(' → ')}`
              : 'Add at least one channel'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, color: '#5a6b85', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={() => canSave && onSave(draft)}
              style={{
                background: '#2f5aa0', border: 'none', borderRadius: 10, padding: '10px 24px', fontFamily: 'inherit',
                fontSize: 14.5, fontWeight: 800, color: '#fff', cursor: canSave ? 'pointer' : 'not-allowed',
                boxShadow: '0 2px 8px rgba(47,90,160,.3)', opacity: canSave ? 1 : 0.45, whiteSpace: 'nowrap',
              }}
            >
              {isNew ? 'Add message' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Field({ label, value, onChange, max, placeholder, textarea }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={sectionLabel}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#b1bccb' }}>{value.length}/{max}</span>
      </div>
      {textarea ? (
        <textarea rows={3} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
      ) : (
        <input value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
      )}
    </div>
  )
}

function ChannelRow({ channel, index, count, active, onSelect, onMove, onRemove, onToggleFeed }) {
  const meta = CHANNELS[channel.type]
  const Icon = CHANNEL_ICONS[channel.type]
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 11, cursor: 'pointer',
        border: `1px solid ${active ? '#cfe1f6' : '#e2e8f1'}`, background: active ? '#eef5fc' : '#fff',
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: '50%', flex: 'none', background: '#17335f', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {index + 1}
      </span>
      <span style={{ width: 30, height: 30, borderRadius: 8, flex: 'none', background: '#e6effb', color: '#2f6fc4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#17335f' }}>{meta.label}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#8a95a6' }}>{meta.desc}</div>
      </div>
      {meta.feedCompanion && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFeed() }}
          title="Also publish a card to the app feed"
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 8, fontFamily: 'inherit',
            fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
            border: `1px solid ${channel.feedCard ? '#cfe1f6' : '#e2e8f1'}`,
            background: channel.feedCard ? '#e6effb' : '#fff',
            color: channel.feedCard ? '#2f6fc4' : '#8a95a6',
          }}
        >
          {channel.feedCard && <CheckIcon size={10} stroke="#2f6fc4" />}
          Feed card
        </button>
      )}
      <div style={{ display: 'flex', gap: 2, flex: 'none' }}>
        <RowButton disabled={index === 0} onClick={(e) => { e.stopPropagation(); onMove(-1) }}><ChevronUpIcon size={13} /></RowButton>
        <RowButton disabled={index === count - 1} onClick={(e) => { e.stopPropagation(); onMove(1) }}><ChevronDownIcon size={13} /></RowButton>
        <RowButton onClick={(e) => { e.stopPropagation(); onRemove() }}><CloseIcon size={12} /></RowButton>
      </div>
    </div>
  )
}

function RowButton({ disabled, onClick, children }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 24, height: 24, borderRadius: 7, border: 'none', background: 'transparent', color: '#8a95a6',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.3 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      }}
    >
      {children}
    </button>
  )
}

function Preview({ channel, draft }) {
  const title = draft.title || 'Grab your users’ attention'
  const body = draft.body || 'Add 1–2 lines that make this worth a tap.'
  const cta = draft.cta || 'Open app'

  if (!channel) {
    return (
      <div style={{ padding: '22px 12px 12px', textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.75)' }}>
        Add a delivery channel below to see a live preview here.
      </div>
    )
  }

  if (channel === 'push') {
    return (
      <div style={{ marginTop: 10, background: 'rgba(255,255,255,.96)', borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, flex: 'none', background: 'linear-gradient(135deg,#1f4a86,#2f7fd6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15 }}>
          P
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.4px' }}>Pulsate</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: '#b1bccb' }}>now</span>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#17335f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#5a6b85', lineHeight: 1.35 }}>{body}</div>
        </div>
      </div>
    )
  }

  if (channel === 'inapp') {
    return (
      <div style={{ marginTop: 10, background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 220, background: '#fff', borderRadius: 12, padding: 14, textAlign: 'center', boxShadow: '0 8px 24px rgba(10,20,40,.35)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#17335f' }}>{title}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#5a6b85', marginTop: 4, lineHeight: 1.4 }}>{body}</div>
          <div style={{ marginTop: 10, background: '#2f6fc4', borderRadius: 8, padding: '7px 0', fontSize: 12, fontWeight: 800, color: '#fff' }}>{cta}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 10, background: 'rgba(255,255,255,.96)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ height: 52, background: '#dfe4ec', color: '#a6b1c1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ImageIcon size={20} />
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: '#17335f' }}>{title}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#5a6b85', marginTop: 2, lineHeight: 1.4 }}>{body}</div>
        <div style={{ marginTop: 8, background: '#2f6fc4', borderRadius: 8, padding: '7px 0', fontSize: 12, fontWeight: 800, color: '#fff', textAlign: 'center' }}>{cta}</div>
      </div>
    </div>
  )
}

function SkipOption({ selected, onSelect, title, desc, note }) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', gap: 11, padding: '12px 14px', borderRadius: 11, cursor: 'pointer',
        border: `1px solid ${selected ? '#cfe1f6' : '#e2e8f1'}`, background: selected ? '#eef5fc' : '#fff',
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: '50%', flex: 'none', marginTop: 1, boxSizing: 'border-box', border: `2px solid ${selected ? '#2f7fd6' : '#c3ccd9'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2f7fd6' }} />}
      </span>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#17335f' }}>{title}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#8a95a6', marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
        {note && (
          <div style={{ marginTop: 7, fontSize: 11.5, fontWeight: 800, color: '#8a6d2e', background: '#fbf1dc', borderRadius: 7, padding: '5px 9px', display: 'inline-block' }}>
            {note}
          </div>
        )}
      </div>
    </div>
  )
}
