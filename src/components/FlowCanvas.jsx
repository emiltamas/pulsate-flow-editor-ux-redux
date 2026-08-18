import { useEffect, useRef, useState } from 'react'
import { ReactFlow, useReactFlow, Handle, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CHANNELS, PRODUCT_CATEGORIES, audienceReach, ruleSentence, mockPerformance, fmt, trigLabel, rulePlural } from '../data'
import { PlayIcon, PencilIcon, UsersIcon, SendIcon, TypeIcon, DwellIcon, BranchIcon, ChartIcon } from '../icons'
import { TRIGGER_META } from './EntryPanel'

const NODE_WIDTH = 300
const CONNECTOR_GAP = 26
// measured heights of node variants, used to stack the chain
const EMPTY_NODE_HEIGHT = 196
const CARD_NODE_HEIGHT = 219
const MESSAGE_NODE_HEIGHT = 197
const PERF_BAND_START = 34 // stat bands appended in performance mode
const PERF_BAND_MESSAGE = 52

const nodeTypes = { start: StartNode, message: MessageNode, addStep: AddStepNode }

const edgeStyle = { stroke: 'rgba(255,255,255,.5)', strokeWidth: 2 }

/* The editor owns the layout: nodes are stacked vertically from a fixed
   origin, so positions are derived, never user-set. */
const layoutNodes = ({ isEmpty, entry, audience, reach, message, perf, addActive, addMenuOpen }) => {
  const nodes = []
  let y = 0

  nodes.push({
    id: 'start',
    type: 'start',
    position: { x: -NODE_WIDTH / 2, y },
    data: { isEmpty, entry, audience, reach, perf },
  })
  y += (isEmpty ? EMPTY_NODE_HEIGHT : CARD_NODE_HEIGHT + (perf ? PERF_BAND_START : 0)) + CONNECTOR_GAP

  if (message) {
    nodes.push({
      id: 'message',
      type: 'message',
      position: { x: -NODE_WIDTH / 2, y },
      data: { message, perf },
    })
    y += MESSAGE_NODE_HEIGHT + (perf ? PERF_BAND_MESSAGE : 0) + CONNECTOR_GAP
  }

  nodes.push({
    id: 'add',
    type: 'addStep',
    position: { x: -17, y },
    data: { active: addActive, menuOpen: addMenuOpen },
  })

  return nodes
}

export default function FlowCanvas({ entry, audience, audiences, message, showPerf, sidebarOpen, onOpenEntry, onOpenMessage }) {
  const geoCount = Object.keys(entry.trigger.geoSel).length
  const isEmpty = !audience && !(entry.trigger.type === 'location' && geoCount > 0)
  const addActive = !isEmpty && !message

  const [addMenuOpen, setAddMenuOpen] = useState(false)

  const pickStep = (type) => {
    setAddMenuOpen(false)
    if (type === 'message') onOpenMessage()
  }

  const reach = audience ? audienceReach(audience, audiences) : { members: 0, products: null }
  const perf = showPerf && !isEmpty ? mockPerformance(reach.members, (entry.exits?.goal ?? 'none') !== 'none') : null

  const nodes = layoutNodes({ isEmpty, entry, audience, reach, message, perf, addActive, addMenuOpen }).map((n) =>
    n.id === 'add' ? { ...n, data: { ...n.data, onPick: pickStep } } : n
  )

  const edges = message
    ? [
        { id: 'start->message', source: 'start', target: 'message', type: 'straight', style: edgeStyle },
        { id: 'message->add', source: 'message', target: 'add', type: 'straight', style: edgeStyle },
      ]
    : [{ id: 'start->add', source: 'start', target: 'add', type: 'straight', style: edgeStyle }]

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        // without a flow-level click handler, non-draggable non-selectable
        // nodes get pointer-events:none and inner clicks never fire
        onNodeClick={(_, node) => {
          if (node.id === 'start') {
            setAddMenuOpen(false)
            onOpenEntry()
          } else if (node.id === 'message') {
            setAddMenuOpen(false)
            onOpenMessage()
          } else if (node.id === 'add' && addActive) {
            setAddMenuOpen((v) => !v)
          }
        }}
        onPaneClick={() => setAddMenuOpen(false)}
        defaultViewport={{ x: 500, y: 120, zoom: 1 }}
        minZoom={0.4}
        maxZoom={1.75}
        translateExtent={[[-1200, -600], [1200, 1600]]}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        elementsSelectable={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#5f7bab' }}
      >
        <ViewportShifter sidebarOpen={sidebarOpen} />
      </ReactFlow>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 34, background: '#eef1f6', zIndex: 10 }} />
    </div>
  )
}

/* Pans the viewport so the flow re-centers when the sidebar opens/closes. */
function ViewportShifter({ sidebarOpen }) {
  const { getViewport, setViewport } = useReactFlow()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const vp = getViewport()
    setViewport({ ...vp, x: vp.x + (sidebarOpen ? -220 : 220) }, { duration: 250 })
  }, [sidebarOpen, getViewport, setViewport])
  return null
}

const hiddenHandle = { opacity: 0, pointerEvents: 'none', border: 'none', background: 'transparent' }

function StartNode({ data }) {
  return (
    <div style={{ width: NODE_WIDTH, display: 'flex', justifyContent: 'center' }}>
      {data.isEmpty ? (
        <EmptyStartNode />
      ) : (
        <StartNodeCard entry={data.entry} audience={data.audience} reach={data.reach} perf={data.perf} />
      )}
      <Handle type="source" position={Position.Bottom} style={hiddenHandle} />
    </div>
  )
}

function triggerDetail(trigger) {
  if (trigger.type === 'audience') return 'Always on — enters on joining the audience'
  if (trigger.type === 'schedule') return 'One-time send · not scheduled yet'
  if (trigger.type === 'date') {
    const field = trigger.dateField === 'maturity' ? 'maturity date' : trigger.dateField === 'expires' ? 'offer expiration' : 'payment due date'
    return `${trigger.dateDays} days before ${field} · recurring`
  }
  const geoSel = trigger.geoSel
  const idx = Object.keys(geoSel)
  if (!idx.length) return 'No geofences selected'
  const parts = ['enter', 'exit', 'dwell']
    .map((t) => [idx.filter((i) => geoSel[i].trigger === t).length, t])
    .filter(([n]) => n > 0)
    .map(([n, t]) => `${n} on ${trigLabel(t).replace(/s$/, '')}`)
  return `${idx.length} geofence${idx.length === 1 ? '' : 's'} · ${parts.join(' · ')}`
}

function StartNodeCard({ entry, audience, reach, perf }) {
  const trig = TRIGGER_META[entry.trigger.type]
  return (
    <div style={{ width: 300, background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px rgba(20,34,60,.22)', overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ background: 'linear-gradient(135deg,#1f4a86,#2f7fd6)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#fff' }}>
          <PlayIcon size={17} stroke="#fff" />
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.4px', textTransform: 'uppercase' }}>Start · Entry</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(() => {
            const ex = entry.exits ?? {}
            const n = (ex.goal !== 'none' && ex.goal ? 1 : 0) + (ex.instanceExit ? 1 : 0) + (ex.audienceExit ? 1 : 0)
            const bits = []
            if (n) bits.push(`${n} exit${n === 1 ? '' : 's'}`)
            if (entry.reenroll && entry.reenroll !== 'off') bits.push(entry.reenroll === 'once' ? 're-enter once' : 're-enter per event')
            return bits.length ? (
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,.22)', padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                {bits.join(' · ')}
              </span>
            ) : null
          })()}
          <PencilIcon size={16} stroke="#fff" />
        </div>
      </div>
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }}>Estimated reach</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#17335f', lineHeight: 1, letterSpacing: '-.5px' }}>
              {reach.members ? `~${fmt(reach.members)}` : '—'}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#8a95a6' }}>
              {reach.members
                ? reach.products !== null
                  ? `members · ${fmt(reach.products)} matching ${rulePlural(audience.rule)}`
                  : 'members'
                : 'all who trigger'}
            </div>
          </div>
        </div>
        <SummaryLine
          icon={<trig.Icon size={17} />}
          iconBg="#fbf1dc"
          iconFg="#8a6d2e"
          label={trig.label}
          detail={triggerDetail(entry.trigger)}
        />
        <SummaryLine
          icon={<UsersIcon size={18} />}
          iconBg="#e6effb"
          iconFg="#2f6fc4"
          label={audience ? audience.name : 'No audience'}
          detail={audience
            ? audience.rule ? ruleSentence(audience.rule) : `${audience.kind} audience`
            : 'Everyone matching the trigger'}
        />
      </div>
      {perf && (
        <div style={{ borderTop: '1px solid #dcefe3', background: '#eef9f1', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 7, color: '#1f6f4a', fontSize: 11.5, fontWeight: 800 }}>
          <ChartIcon size={13} />
          {fmt(perf.entered)} entered{perf.goalReached != null && ` · ${fmt(perf.goalExits)} goal exits`} · {fmt(perf.removed)} removed
        </div>
      )}
    </div>
  )
}

function MessageNode({ data }) {
  const m = data.message
  const cascade = m.channels
    .map((c) => CHANNELS[c.type].short + (c.feedCard ? ' + Feed card' : ''))
    .join('  →  ')

  return (
    <div style={{ width: NODE_WIDTH, background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px rgba(20,34,60,.22)', overflow: 'hidden', cursor: 'pointer' }}>
      <Handle type="target" position={Position.Top} style={hiddenHandle} />
      <div style={{ background: 'linear-gradient(135deg,#5b3a9e,#7a4fc0)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#fff' }}>
          <SendIcon size={16} stroke="#fff" />
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.4px', textTransform: 'uppercase' }}>Message</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {m.skip === 'conditional' && (
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,.22)', padding: '3px 8px', borderRadius: 20 }}>
              Skip rules
            </span>
          )}
          <PencilIcon size={16} stroke="#fff" />
        </div>
      </div>
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: m.name ? '#17335f' : '#8a95a6' }}>
          {m.name || 'Untitled message'}
        </div>
        <SummaryLine
          icon={<SendIcon size={16} />}
          iconBg="#efe8fb"
          iconFg="#7a4fc0"
          label={`${m.channels.length} ${m.channels.length === 1 ? 'channel' : 'channels'}`}
          detail={cascade}
        />
        <SummaryLine
          icon={<TypeIcon size={16} />}
          iconBg="#e6effb"
          iconFg="#2f6fc4"
          label={m.title || 'No content yet'}
          detail={m.body || 'Add a title and text'}
        />
      </div>
      {data.perf && (
        <div style={{ borderTop: '1px solid #dcefe3', background: '#eef9f1', padding: '8px 18px', color: '#1f6f4a', fontSize: 11.5, fontWeight: 700, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 800 }}>{fmt(data.perf.delivered)} delivered · {fmt(data.perf.opened)} opened</div>
          <div>
            {fmt(data.perf.clicked)} clicked
            {data.perf.goalReached != null && ` · ${fmt(data.perf.goalReached)} reached the goal`}
          </div>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={hiddenHandle} />
    </div>
  )
}

const STEP_TYPES = [
  { key: 'message', title: 'Message', desc: 'Push, in-app or feed post', Icon: SendIcon, enabled: true },
  { key: 'delay', title: 'Delay', desc: 'Wait before the next step', Icon: DwellIcon, enabled: false },
  { key: 'branch', title: 'Branch', desc: 'Split by behavior', Icon: BranchIcon, enabled: false },
]

function AddStepNode({ data }) {
  const base = {
    width: 34,
    height: 34,
    borderRadius: '50%',
    fontSize: 20,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  }
  return (
    <>
      <Handle type="target" position={Position.Top} style={hiddenHandle} />
      {data.active ? (
        <button
          style={{ ...base, border: 'none', background: 'rgba(255,255,255,.9)', color: '#2f6fc4', cursor: 'pointer', boxShadow: '0 3px 10px rgba(20,34,60,.2)' }}
        >
          +
        </button>
      ) : (
        <div style={{ ...base, background: 'rgba(255,255,255,.28)', color: '#fff' }}>+</div>
      )}
      {data.menuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)', width: 244,
            background: '#fff', border: '1px solid #dbe3ee', borderRadius: 12,
            boxShadow: '0 14px 36px rgba(20,34,60,.28)', overflow: 'hidden', cursor: 'default',
          }}
        >
          <div style={{ padding: '11px 14px 7px', fontSize: 11, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Add a step
          </div>
          {STEP_TYPES.map(({ key, title, desc, Icon, enabled }) => (
            <div
              key={key}
              className={enabled ? 'row' : undefined}
              onClick={(e) => {
                e.stopPropagation()
                if (enabled) data.onPick(key)
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 14px', cursor: enabled ? 'pointer' : 'default', opacity: enabled ? 1 : 0.45 }}
            >
              <span style={{ width: 30, height: 30, borderRadius: 8, flex: 'none', background: '#e6effb', color: '#2f6fc4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} />
              </span>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#17335f' }}>{title}</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#8a95a6' }}>{desc}</div>
              </div>
              {!enabled && (
                <span style={{ fontSize: 10.5, fontWeight: 800, color: '#8a6d2e', background: '#fbf1dc', padding: '3px 8px', borderRadius: 20 }}>Soon</span>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function EmptyStartNode() {
  return (
    <div
      style={{
        width: 260,
        background: 'rgba(255,255,255,.14)',
        border: '2px dashed rgba(255,255,255,.6)',
        borderRadius: 16,
        padding: '26px 22px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,.9)', color: '#2f6fc4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PlayIcon size={22} />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Set up the entry step</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.8)', marginTop: 3 }}>No trigger or audience yet</div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,.22)', padding: '7px 16px', borderRadius: 9 }}>+ Choose entry</div>
    </div>
  )
}

function SummaryLine({ icon, iconBg, iconFg, label, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, flex: 'none', background: iconBg, color: iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#17335f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 210 }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#8a95a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 210 }}>{detail}</div>
      </div>
    </div>
  )
}
