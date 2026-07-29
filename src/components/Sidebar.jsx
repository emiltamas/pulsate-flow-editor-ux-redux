import { useState } from 'react'
import {
  SEGMENTS, GEOFENCES, SEG_GROUPS, GEO_GROUPS,
  TOTAL_SEGMENTS, TOTAL_GEOFENCES, REACH_CEILING, TOTAL_MEMBERS,
  PRODUCT_CATEGORIES, productReach, ruleActive, ruleSentence,
  tagColor, fmt, trigLabel,
} from '../data'
import {
  CloseIcon, UsersIcon, PinIcon, SearchIcon, ChevronDownIcon,
  CheckIcon, EyeIcon, EnterIcon, ExitIcon, DwellIcon, ProductIcon,
} from '../icons'
import UserDrillIn from './UserDrillIn'
import ProductsPanel from './ProductsPanel'

export default function Sidebar({
  mode, setMode,
  segSel, toggleSeg,
  geoSel, toggleGeo, setTrigger, bumpDwell,
  productRule, setProductRule, freqCap, setFreqCap,
  savedAudiences, saveAudience,
  saved, onClose, onSave,
}) {
  const [grpOpen, setGrpOpen] = useState(false)
  const [segGroups, setSegGroups] = useState(() => new Set())
  const [geoGroups, setGeoGroups] = useState(() => new Set())
  const [geoActiveOnly, setGeoActiveOnly] = useState(false)
  const [viewSeg, setViewSeg] = useState(null)
  const [query, setQuery] = useState('')

  const isSeg = mode === 'segments'
  const isGeo = mode === 'geofences'
  const isProd = mode === 'products'
  const segCount = segSel.size
  const geoCount = Object.keys(geoSel).length

  const groups = isSeg ? SEG_GROUPS : GEO_GROUPS
  const activeGroups = isSeg ? segGroups : geoGroups
  const setActiveGroups = isSeg ? setSegGroups : setGeoGroups
  const data = isSeg ? SEGMENTS : GEOFENCES

  const switchMode = (m) => {
    setMode(m)
    setGrpOpen(false)
    setQuery('')
  }

  const toggleGroup = (name) =>
    setActiveGroups((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })

  const q = query.trim().toLowerCase()
  let visible = data
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => (activeGroups.size ? activeGroups.has(item.group) : true))
    .filter(({ item }) => (q ? item.name.toLowerCase().includes(q) : true))
  if (!isSeg && geoActiveOnly) visible = visible.filter(({ i }) => !!geoSel[i])

  const showEmpty = !isSeg && geoActiveOnly && geoCount === 0

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
                {saved ? 'Edit entry audience' : 'Let’s choose who enters'}
              </h1>
              <p style={{ margin: '5px 0 0', fontSize: 13.5, color: '#8a95a6', fontWeight: 500 }}>
                {saved
                  ? 'Update the segments and geofences that enroll people into this automation.'
                  : 'Start by adding the segments or geofences that should enroll people. You can fine-tune this anytime.'}
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a95a6', padding: 2, display: 'flex' }}>
              <CloseIcon size={21} />
            </button>
          </div>
          <div style={{ marginTop: 14, display: 'flex', background: '#eef1f6', borderRadius: 11, padding: 4, gap: 4 }}>
            <Tab active={isSeg} onClick={() => switchMode('segments')} icon={<UsersIcon size={15} />} label="Segments" count={segCount} />
            <Tab active={isGeo} onClick={() => switchMode('geofences')} icon={<PinIcon size={15} />} label="Geofences" count={geoCount} />
            <Tab active={isProd} onClick={() => switchMode('products')} icon={<ProductIcon size={15} />} label="Products" count={ruleActive(productRule) ? 1 : 0} />
          </div>
        </div>

        <ReachHero mode={mode} segSel={segSel} geoCount={geoCount} productRule={productRule} />

        {/* toolbar */}
        {!isProd && (
        <div style={{ padding: '12px 24px 8px', display: 'flex', gap: 9 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1px solid #d8e0ea', borderRadius: 10, padding: '0 12px', height: 40 }}>
            <SearchIcon size={16} stroke="#8a95a6" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isSeg ? `Search ${TOTAL_SEGMENTS} segments` : `Search ${TOTAL_GEOFENCES} geofences`}
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: 'inherit', fontSize: 14, color: '#17335f', fontWeight: 600 }}
            />
          </div>
          <GroupsFilter
            open={grpOpen}
            setOpen={setGrpOpen}
            groups={groups}
            active={activeGroups}
            counts={groups.map((g) => data.filter((d) => d.group === g).length)}
            onToggle={toggleGroup}
            onClear={() => setActiveGroups(new Set())}
          />
        </div>
        )}

        {/* selected chips (segments only) */}
        {isSeg && segCount > 0 && (
          <div style={{ padding: '2px 24px 8px', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {[...segSel].map((i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#eef5fc', border: '1px solid #cfe1f6', borderRadius: 8, padding: '5px 6px 5px 10px' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1f4a86', maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {SEGMENTS[i].name}
                </span>
                <button
                  onClick={() => toggleSeg(i)}
                  style={{ width: 18, height: 18, borderRadius: 5, border: 'none', background: '#d7e6f7', color: '#2f6fc4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <CloseIcon size={10} strokeWidth={3} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* active-only filter (geofences) */}
        {isGeo && (
          <div style={{ padding: '2px 24px 8px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setGeoActiveOnly((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 2px' }}
            >
              <span style={{ width: 38, height: 22, borderRadius: 999, display: 'flex', alignItems: 'center', padding: 2, boxSizing: 'border-box', transition: 'background .15s', background: geoActiveOnly ? '#2f7fd6' : '#c3ccd9' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.25)', transition: 'transform .15s', transform: geoActiveOnly ? 'translateX(16px)' : 'translateX(0)' }} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: geoActiveOnly ? '#2f6fc4' : '#5a6b85' }}>Active only</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#8a95a6' }}>· {geoCount}</span>
            </button>
          </div>
        )}

        {/* column head */}
        {!isProd && (
        <div style={{ padding: '6px 24px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #edf1f6' }}>
          <span style={colHeadStyle}>{isSeg ? 'Segment name' : 'Geofence name'}</span>
          <span style={colHeadStyle}>{isSeg ? 'Approx. users' : 'Set trigger'}</span>
        </div>
        )}

        {/* products rule builder */}
        {isProd && (
          <ProductsPanel
            rule={productRule}
            onChange={setProductRule}
            freqCap={freqCap}
            onFreqCapChange={setFreqCap}
            savedAudiences={savedAudiences}
            onSaveAudience={saveAudience}
          />
        )}

        {/* list */}
        {!isProd && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {isSeg
            ? visible.map(({ item, i }) => (
                <SegmentRow
                  key={i}
                  segment={item}
                  selected={segSel.has(i)}
                  onToggle={() => toggleSeg(i)}
                  onView={(e) => {
                    e.stopPropagation()
                    setViewSeg(i)
                    setGrpOpen(false)
                  }}
                />
              ))
            : visible.map(({ item, i }) => (
                <GeofenceRow
                  key={i}
                  geofence={item}
                  config={geoSel[i]}
                  onToggle={() => toggleGeo(i)}
                  onSetTrigger={(t) => setTrigger(i, t)}
                  onBumpDwell={(d) => bumpDwell(i, d)}
                />
              ))}
          {showEmpty && (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: '#17335f' }}>No active geofences</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#8a95a6', marginTop: 4 }}>Turn off "Active only" to browse and add geofences.</div>
            </div>
          )}
        </div>
        )}

        {/* drill-in: users in segment */}
        {isSeg && viewSeg !== null && (
          <UserDrillIn
            segIndex={viewSeg}
            selected={segSel.has(viewSeg)}
            productRule={productRule}
            onToggle={() => toggleSeg(viewSeg)}
            onBack={() => setViewSeg(null)}
          />
        )}

        {/* footer */}
        <div style={{ borderTop: '1px solid #edf1f6', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#8a95a6', maxWidth: 230 }}>
            {isSeg
              ? segCount ? `${segCount} of ${TOTAL_SEGMENTS} selected` : 'Nothing selected yet'
              : isProd
                ? ruleActive(productRule) ? ruleSentence(productRule) : 'No product rule yet'
                : geoActiveOnly
                  ? geoCount ? `Showing ${geoCount} active` : '0 active'
                  : geoCount ? `${geoCount} of ${TOTAL_GEOFENCES} geofences` : 'No geofences selected'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, color: '#5a6b85', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={onSave}
              style={{ background: '#2f5aa0', border: 'none', borderRadius: 10, padding: '10px 24px', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 800, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(47,90,160,.3)', whiteSpace: 'nowrap' }}
            >
              {saved ? 'Save changes' : 'Add audience'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

const colHeadStyle = { fontSize: 11, fontWeight: 800, color: '#8a95a6', textTransform: 'uppercase', letterSpacing: '.5px' }

function Tab({ active, onClick, icon, label, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        border: 'none',
        borderRadius: 8,
        padding: '9px 6px',
        fontFamily: 'inherit',
        fontSize: 13.5,
        fontWeight: 800,
        cursor: 'pointer',
        ...(active
          ? { background: '#fff', color: '#17335f', boxShadow: '0 1px 3px rgba(20,34,60,.15)' }
          : { background: 'transparent', color: '#8a95a6' }),
      }}
    >
      {icon}
      {label} <span style={{ opacity: 0.7 }}>· {count}</span>
    </button>
  )
}

function ReachHero({ mode, segSel, geoCount, productRule }) {
  const isSeg = mode === 'segments'
  const isProd = mode === 'products'
  const reach = [...segSel].reduce((a, i) => a + SEGMENTS[i].users, 0)
  const segCount = segSel.size

  let label = isSeg ? 'Estimated reach' : 'Location triggers'
  let big = isSeg ? (segCount ? `~${fmt(reach)}` : '0') : geoCount ? fmt(geoCount) : '0'
  let sub = isSeg
    ? segCount ? `users · ${segCount} ${segCount === 1 ? 'segment' : 'segments'}` : 'no audience yet'
    : geoCount ? (geoCount === 1 ? 'geofence active' : 'geofences active') : 'none active yet'
  let pct = isSeg
    ? segCount ? Math.min(100, Math.round((reach / REACH_CEILING) * 100)) : 0
    : geoCount ? Math.min(100, Math.round((geoCount / TOTAL_GEOFENCES) * 100)) : 0

  if (isProd) {
    const base = segCount ? reach : TOTAL_MEMBERS
    const pr = productReach(productRule, base)
    label = 'Estimated reach'
    if (pr) {
      const plural = PRODUCT_CATEGORIES[productRule.category].plural
      big = `~${fmt(pr.members)}`
      sub = pr.products !== null ? `members · ${fmt(pr.products)} matching ${plural}` : 'members'
      pct = Math.min(100, Math.round((pr.members / base) * 100))
    } else {
      big = `~${fmt(base)}`
      sub = segCount ? 'members · no product rule yet' : 'all members · no product rule yet'
      pct = 0
    }
  }

  return (
    <div style={{ margin: '14px 24px 6px', borderRadius: 13, background: 'linear-gradient(135deg,#1f4a86,#2f7fd6)', padding: '14px 16px', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.6px', textTransform: 'uppercase', opacity: 0.82 }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 2 }}>
            <div style={{ fontSize: 29, fontWeight: 800, lineHeight: 1, letterSpacing: '-.5px' }}>{big}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.85 }}>{sub}</div>
          </div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isSeg ? <UsersIcon size={21} stroke="#fff" /> : isProd ? <ProductIcon size={21} stroke="#fff" /> : <PinIcon size={21} stroke="#fff" />}
        </div>
      </div>
      <div style={{ marginTop: 11, height: 6, borderRadius: 6, background: 'rgba(255,255,255,.25)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#fff', transition: 'width .2s' }} />
      </div>
    </div>
  )
}

function GroupsFilter({ open, setOpen, groups, active, counts, onToggle, onClear }) {
  const n = active.size
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: n ? '#eef5fc' : '#fff',
          border: `1px solid ${n ? '#cfe1f6' : '#d8e0ea'}`,
          borderRadius: 10,
          padding: '0 12px',
          height: 40,
          fontFamily: 'inherit',
          fontSize: 13.5,
          fontWeight: 700,
          color: n ? '#2f6fc4' : '#17335f',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {n ? `Groups · ${n}` : 'Groups'}
        <ChevronDownIcon size={13} />
      </button>
      {open && (
        <>
          <div style={{ position: 'absolute', top: 46, right: 0, width: 236, background: '#fff', border: '1px solid #dbe3ee', borderRadius: 12, boxShadow: '0 14px 36px rgba(20,34,60,.22)', zIndex: 40, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: '1px solid #edf1f6' }}>
              <span style={colHeadStyle}>Filter by group</span>
              <button onClick={onClear} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800, color: '#2f6fc4', cursor: 'pointer', padding: 0 }}>
                Clear
              </button>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', padding: '4px 0' }}>
              {groups.map((name, gi) => {
                const on = active.has(name)
                return (
                  <div key={name} className="row" onClick={() => onToggle(name)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 14px', cursor: 'pointer' }}>
                    <Checkbox on={on} size={19} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#1b3a63' }}>{name}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#8a95a6' }}>{counts[gi]}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
        </>
      )}
    </div>
  )
}

function Checkbox({ on, size = 20 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2px solid ${on ? '#2f7fd6' : '#c3ccd9'}`,
        background: on ? '#2f7fd6' : '#fff',
        boxSizing: 'border-box',
      }}
    >
      {on && <CheckIcon size={size - 8} stroke="#fff" />}
    </div>
  )
}

function SegmentRow({ segment, selected, onToggle, onView }) {
  return (
    <div style={{ borderBottom: '1px solid #f4f6fa', background: selected ? '#eef5fc' : '#fff', borderLeft: `3px solid ${selected ? '#2f7fd6' : 'transparent'}` }}>
      <div className="row" onClick={onToggle} style={rowStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Checkbox on={selected} />
          <div style={{ minWidth: 0 }}>
            <div style={rowNameStyle}>{segment.name}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: tagColor(segment.group), marginTop: 1 }}>{segment.group}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none', marginLeft: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#4a6088', textAlign: 'right' }}>{fmt(segment.users)}</span>
          <button
            onClick={onView}
            title="View users in segment"
            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #dbe3ee', background: '#fff', color: '#5a6b85', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <EyeIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function GeofenceRow({ geofence, config, onToggle, onSetTrigger, onBumpDwell }) {
  const on = !!config
  const t = config?.trigger
  return (
    <div style={{ borderBottom: '1px solid #f4f6fa', background: on ? '#eef5fc' : '#fff', borderLeft: `3px solid ${on ? '#2f7fd6' : 'transparent'}` }}>
      <div className="row" onClick={onToggle} style={rowStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Checkbox on={on} />
          <div style={{ minWidth: 0 }}>
            <div style={rowNameStyle}>{geofence.name}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: on ? '#2f7fd6' : tagColor(geofence.group), marginTop: 1 }}>
              {on ? `Triggers when user ${trigLabel(t)}${t === 'dwell' ? ` ${config.dwell}m` : ''}` : geofence.group}
            </div>
          </div>
        </div>
      </div>
      {on && (
        <div style={{ padding: '2px 24px 14px 44px' }}>
          <div style={{ ...colHeadStyle, fontSize: 10.5, marginBottom: 7 }}>Trigger when a user…</div>
          <div style={{ display: 'flex', background: '#eef1f6', borderRadius: 10, padding: 3, gap: 3 }}>
            <TriggerButton active={t === 'enter'} onClick={() => onSetTrigger('enter')} icon={<EnterIcon size={15} />} label="Enters" />
            <TriggerButton active={t === 'exit'} onClick={() => onSetTrigger('exit')} icon={<ExitIcon size={15} />} label="Exits" />
            <TriggerButton active={t === 'dwell'} onClick={() => onSetTrigger('dwell')} icon={<DwellIcon size={15} />} label="Dwells" />
          </div>
          {t === 'dwell' && (
            <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 10, background: '#eef5fc', border: '1px solid #cfe1f6', borderRadius: 10, padding: '9px 12px' }}>
              <span style={dwellLabelStyle}>Stays for at least</span>
              <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #cfe1f6', borderRadius: 8, overflow: 'hidden' }}>
                <button onClick={() => onBumpDwell(-1)} style={{ ...stepperBtnStyle, fontSize: 19 }}>−</button>
                <span style={{ minWidth: 34, textAlign: 'center', fontSize: 15, fontWeight: 800, color: '#17335f' }}>{config.dwell}</span>
                <button onClick={() => onBumpDwell(1)} style={{ ...stepperBtnStyle, fontSize: 18 }}>+</button>
              </div>
              <span style={dwellLabelStyle}>minutes</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px 10px 21px', cursor: 'pointer', background: 'transparent' }
const rowNameStyle = { fontSize: 14.5, fontWeight: 700, color: '#1b3a63', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const dwellLabelStyle = { fontSize: 13, fontWeight: 700, color: '#1f4a86' }
const stepperBtnStyle = { width: 30, height: 32, border: 'none', background: '#fff', color: '#2f6fc4', fontWeight: 800, cursor: 'pointer', lineHeight: 1 }

function TriggerButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        border: 'none',
        borderRadius: 8,
        padding: '8px 4px',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 800,
        cursor: 'pointer',
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
