import { useEffect, useRef, useState } from 'react'
import { ReactFlow, useReactFlow, Handle, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SEGMENTS, GEOFENCES, CHANNELS, fmt } from '../data'
import {
  PlayIcon, PencilIcon, UsersIcon, PinIcon, ChevronLeftIcon,
  SendIcon, TypeIcon, DwellIcon, BranchIcon,
} from '../icons'

const NODE_WIDTH = 300
const CONNECTOR_GAP = 26
// measured heights of node variants, used to stack the chain
const EMPTY_NODE_HEIGHT = 196
const CARD_NODE_HEIGHT = 219
const MESSAGE_NODE_HEIGHT = 197

const nodeTypes = { start: StartNode, message: MessageNode, addStep: AddStepNode }

const edgeStyle = { stroke: 'rgba(255,255,255,.5)', strokeWidth: 2 }

/* The editor owns the layout: nodes are stacked vertically from a fixed
   origin, so positions are derived, never user-set. */
const layoutNodes = ({ isEmpty, segIdx, geoIdx, geoSel, message, addActive, addMenuOpen }) => {
  const nodes = []
  let y = 0

  nodes.push({
    id: 'start',
    type: 'start',
    position: { x: -NODE_WIDTH / 2, y },
    data: { isEmpty, segIdx, geoIdx, geoSel },
  })
  y += (isEmpty ? EMPTY_NODE_HEIGHT : CARD_NODE_HEIGHT) + CONNECTOR_GAP

  if (message) {
    nodes.push({
      id: 'message',
      type: 'message',
      position: { x: -NODE_WIDTH / 2, y },
      data: { message },
    })
    y += MESSAGE_NODE_HEIGHT + CONNECTOR_GAP
  }

  nodes.push({
    id: 'add',
    type: 'addStep',
    position: { x: -17, y },
    data: { active: addActive, menuOpen: addMenuOpen },
  })

  return nodes
}

export default function FlowCanvas({ segSel, geoSel, message, sidebarOpen, onOpenAudience, onOpenMessage }) {
  const segIdx = [...segSel]
  const geoIdx = Object.keys(geoSel).map(Number)
  const isEmpty = segIdx.length === 0 && geoIdx.length === 0
  const addActive = !isEmpty && !message

  const [addMenuOpen, setAddMenuOpen] = useState(false)

  const pickStep = (type) => {
    setAddMenuOpen(false)
    if (type === 'message') onOpenMessage()
  }

  const nodes = layoutNodes({ isEmpty, segIdx, geoIdx, geoSel, message, addActive, addMenuOpen }).map((n) =>
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
            onOpenAudience()
          } else if (node.id === 'message') {
            setAddMenuOpen(false)
            onOpenMessage()
          } else if (node.id === 'add' && addActive) {
            setAddMenuOpen((v) => !v)
          }
        }}
        onPaneClick={() => setAddMenuOpen(false)}
        defaultViewport={{ x: 500, y: 170, zoom: 1 }}
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
      <TopBar />
      <div style={{ position: 'absolute', top: 56, left: 0, right: 0, height: 34, background: '#eef1f6', zIndex: 10 }} />
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
        <StartNodeCard segIdx={data.segIdx} geoIdx={data.geoIdx} geoSel={data.geoSel} />
      )}
      <Handle type="source" position={Position.Bottom} style={hiddenHandle} />
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

function TopBar() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, zIndex: 10 }}>
      <button
        style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #d8e0ea', background: '#fff', color: '#2f6fc4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <ChevronLeftIcon size={15} strokeWidth={2.4} />
      </button>
      <span style={{ fontSize: 16, fontWeight: 800, color: '#17335f' }}>Untitled automation</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: '#8a6d2e', background: '#fbf1dc', padding: '3px 10px', borderRadius: 20 }}>Draft</span>
    </div>
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
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Set your entry audience</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.8)', marginTop: 3 }}>No segments or geofences yet</div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,.22)', padding: '7px 16px', borderRadius: 9 }}>+ Choose audience</div>
    </div>
  )
}

function StartNodeCard({ segIdx, geoIdx, geoSel }) {
  const reach = segIdx.reduce((a, i) => a + SEGMENTS[i].users, 0)
  const segNames = segIdx.map((i) => SEGMENTS[i].name)
  const geoNames = geoIdx.map((i) => GEOFENCES[i].name)

  const nEnter = geoIdx.filter((i) => geoSel[i].trigger === 'enter').length
  const nExit = geoIdx.filter((i) => geoSel[i].trigger === 'exit').length
  const nDwell = geoIdx.filter((i) => geoSel[i].trigger === 'dwell').length
  const parts = []
  if (nEnter) parts.push(`${nEnter} on entry`)
  if (nExit) parts.push(`${nExit} on exit`)
  if (nDwell) parts.push(`${nDwell} on dwell`)

  return (
    <div style={{ width: 300, background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px rgba(20,34,60,.22)', overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ background: 'linear-gradient(135deg,#1f4a86,#2f7fd6)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#fff' }}>
          <PlayIcon size={17} stroke="#fff" />
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.4px', textTransform: 'uppercase' }}>Start · Entry audience</span>
        </div>
        <PencilIcon size={16} stroke="#fff" />
      </div>
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }}>Estimated reach</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#17335f', lineHeight: 1, letterSpacing: '-.5px' }}>{reach ? `~${fmt(reach)}` : '0'}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#8a95a6' }}>users</div>
          </div>
        </div>
        <SummaryLine
          icon={<UsersIcon size={18} />}
          iconBg="#e6effb"
          iconFg="#2f6fc4"
          label={segIdx.length ? `${segIdx.length} ${segIdx.length === 1 ? 'segment' : 'segments'}` : 'No segments'}
          detail={segNames.length ? segNames.join(', ') : 'None selected'}
        />
        <SummaryLine
          icon={<PinIcon size={18} />}
          iconBg="#e2f4ea"
          iconFg="#1f6f4a"
          label={geoIdx.length ? `${geoIdx.length} ${geoIdx.length === 1 ? 'geofence active' : 'geofences active'}` : 'No geofences'}
          detail={parts.length ? parts.join(' · ') : geoNames.length ? geoNames.join(', ') : 'No location triggers'}
        />
      </div>
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
