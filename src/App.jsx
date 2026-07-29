import { useState } from 'react'
import FlowCanvas from './components/FlowCanvas'
import Sidebar from './components/Sidebar'
import MessageSidebar from './components/MessageSidebar'
import { EMPTY_PRODUCT_RULE } from './data'

export default function App() {
  const [editor, setEditor] = useState('audience') // 'audience' | 'message' | null
  const [audienceSaved, setAudienceSaved] = useState(false)
  const [mode, setMode] = useState('segments')
  const [segSel, setSegSel] = useState(() => new Set())
  const [geoSel, setGeoSel] = useState({})
  const [productRule, setProductRule] = useState({ ...EMPTY_PRODUCT_RULE })
  const [freqCap, setFreqCap] = useState({ n: 1, per: 'day' })
  const [savedAudiences, setSavedAudiences] = useState([])
  const [showPerf, setShowPerf] = useState(false)
  const [message, setMessage] = useState(null)

  const toggleSeg = (i) =>
    setSegSel((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const toggleGeo = (i) =>
    setGeoSel((prev) => {
      const next = { ...prev }
      if (next[i]) delete next[i]
      else next[i] = { trigger: 'enter', dwell: 5 }
      return next
    })

  const setTrigger = (i, trigger) =>
    setGeoSel((prev) => ({ ...prev, [i]: { trigger, dwell: prev[i]?.dwell ?? 5 } }))

  const bumpDwell = (i, delta) =>
    setGeoSel((prev) => {
      const cur = prev[i] ?? { trigger: 'dwell', dwell: 5 }
      return { ...prev, [i]: { ...cur, dwell: Math.max(1, Math.min(240, cur.dwell + delta)) } }
    })

  return (
    <div
      style={{
        position: 'relative',
        width: 1440,
        height: 900,
        overflow: 'hidden',
        background: '#fff',
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}
    >
      <FlowCanvas
        segSel={segSel}
        geoSel={geoSel}
        productRule={productRule}
        message={message}
        showPerf={showPerf}
        onTogglePerf={setShowPerf}
        sidebarOpen={editor !== null}
        onOpenAudience={() => setEditor('audience')}
        onOpenMessage={() => setEditor('message')}
      />
      {editor === 'audience' && (
        <Sidebar
          mode={mode}
          setMode={setMode}
          segSel={segSel}
          toggleSeg={toggleSeg}
          geoSel={geoSel}
          toggleGeo={toggleGeo}
          setTrigger={setTrigger}
          bumpDwell={bumpDwell}
          productRule={productRule}
          setProductRule={setProductRule}
          freqCap={freqCap}
          setFreqCap={setFreqCap}
          savedAudiences={savedAudiences}
          saveAudience={(name, rule) => setSavedAudiences((prev) => [...prev, { name, rule }])}
          saved={audienceSaved}
          onClose={() => setEditor(null)}
          onSave={() => {
            setEditor(null)
            setAudienceSaved(true)
          }}
        />
      )}
      {editor === 'message' && (
        <MessageSidebar
          message={message}
          onClose={() => setEditor(null)}
          onSave={(m) => {
            setMessage(m)
            setEditor(null)
          }}
        />
      )}
    </div>
  )
}
