export const SEGMENTS = [
  { name: 'Active — last 30 days', group: 'Smart', users: 184230 },
  { name: 'New signups this week', group: 'Smart', users: 6842 },
  { name: 'Completed onboarding', group: 'Smart', users: 52107 },
  { name: 'Premium subscribers', group: 'Smart', users: 14903 },
  { name: 'Lapsed 60+ days', group: 'Smart', users: 31288 },
  { name: 'Push opt-in', group: 'System', users: 98450 },
  { name: 'Email subscribers', group: 'System', users: 203115 },
  { name: 'iOS users', group: 'System', users: 76220 },
  { name: 'Black Friday 2025 waitlist', group: 'Uploaded', users: 12004 },
  { name: 'VIP customers — Q2', group: 'Uploaded', users: 842 },
  { name: 'Winback CSV — March', group: 'Uploaded', users: 5310 },
  { name: 'Beta testers', group: 'Manual', users: 126 },
]

export const GEOFENCES = [
  { name: 'Downtown Flagship Store', group: 'Branch' },
  { name: 'Westfield Century City', group: 'Branch' },
  { name: 'Manhattan Beach Store', group: 'Branch' },
  { name: 'Bay Area Dealer Network', group: 'Dealer' },
  { name: 'Texas Dealer Network', group: 'Dealer' },
  { name: 'Southern California Region', group: 'Region' },
  { name: 'Pacific Northwest Region', group: 'Region' },
  { name: 'Summer Festival Pop-up', group: 'Custom' },
  { name: 'Campus Push Zone', group: 'Push' },
]

export const SEG_GROUPS = ['Smart', 'Uploaded', 'Manual', 'System']
export const GEO_GROUPS = ['Custom', 'Push', 'Branch', 'Dealer', 'Region']

export const TOTAL_SEGMENTS = 478
export const TOTAL_GEOFENCES = 79
export const REACH_CEILING = 205004

const TAG_COLORS = {
  Smart: '#1f6f4a', Uploaded: '#7a4fc0', Manual: '#2f6fc4', System: '#8a6d2e',
  Branch: '#2f6fc4', Dealer: '#7a4fc0', Region: '#1f6f4a', Custom: '#5a6b85', Push: '#c05a8a',
}
export const tagColor = (g) => TAG_COLORS[g] || '#5a6b85'

export const fmt = (n) => n.toLocaleString('en-US')

export const trigLabel = (t) => (t === 'enter' ? 'enters' : t === 'exit' ? 'exits' : 'dwells')

export const CHANNELS = {
  push: { label: 'Push notification', short: 'Push', desc: 'Lock screen and notification tray', feedCompanion: true },
  inapp: { label: 'In-app message', short: 'In-app', desc: 'Shown while using the app', feedCompanion: true },
  feed: { label: 'Feed post', short: 'Feed', desc: 'Card published to the app feed', feedCompanion: false },
}
export const CHANNEL_ORDER = ['push', 'inapp', 'feed']

const AVATAR_PALETTE = [
  ['#1f6f4a', '#e2f4ea'], ['#7a4fc0', '#efe8fb'], ['#2f6fc4', '#e6effb'],
  ['#8a6d2e', '#fbf1dc'], ['#c05a8a', '#fbe8f1'],
]

const hash = (s) => {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

const FIRST = ['Amara', 'Diego', 'Priya', 'Liam', 'Noor', 'Kenji', 'Sofia', 'Marcus', 'Yuki', 'Elena', 'Omar', 'Grace', 'Tomas', 'Aisha', 'Ravi', 'Chloe']
const LAST = ['Okafor', 'Reyes', 'Sharma', 'Walsh', 'Haddad', 'Tanaka', 'Rossi', 'Bennett', 'Ito', 'Novak', 'Farah', 'Kim', 'Silva', 'Ali', 'Patel', 'Dubois']

export function sampleUsers(segmentName, n) {
  const h = hash(segmentName)
  const out = []
  for (let k = 0; k < n; k++) {
    const f = FIRST[(h + k * 7) % FIRST.length]
    const l = LAST[(h + k * 13) % LAST.length]
    const [avFg, avBg] = AVATAR_PALETTE[hash(f + l) % AVATAR_PALETTE.length]
    out.push({
      name: `${f} ${l}`,
      email: `${f}.${l}`.toLowerCase() + '@example.com',
      initials: f[0] + l[0],
      id: '#' + String(100000 + ((h + k * 911) % 899999)),
      avFg,
      avBg,
    })
  }
  return out
}
