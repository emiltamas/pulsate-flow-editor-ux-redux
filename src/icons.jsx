const Svg = ({ size = 16, stroke = 'currentColor', strokeWidth = 2.2, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

export const PlayIcon = (p) => (
  <Svg strokeWidth={2.4} {...p}><polygon points="6 4 20 12 6 20 6 4" /></Svg>
)

export const PencilIcon = (p) => (
  <Svg {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Svg>
)

export const CloseIcon = (p) => (
  <Svg {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>
)

export const UsersIcon = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M3.5 20c0-3.3 3-5 5.5-5s5.5 1.7 5.5 5" />
    <circle cx="17.5" cy="9" r="2.6" />
    <path d="M15.5 15c3 .2 5 1.8 5 5" />
  </Svg>
)

export const PinIcon = (p) => (
  <Svg {...p}>
    <path d="M12 21s7-5.7 7-11a7 7 0 0 0-14 0c0 5.3 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.4" />
  </Svg>
)

export const SearchIcon = (p) => (
  <Svg strokeWidth={2.4} {...p}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>
)

export const ChevronDownIcon = (p) => (
  <Svg strokeWidth={2.6} {...p}><polyline points="6 9 12 15 18 9" /></Svg>
)

export const ChevronLeftIcon = (p) => (
  <Svg strokeWidth={2.6} {...p}><polyline points="15 18 9 12 15 6" /></Svg>
)

export const CheckIcon = (p) => (
  <Svg strokeWidth={3.6} {...p}><polyline points="20 6 9 17 4 12" /></Svg>
)

export const EyeIcon = (p) => (
  <Svg {...p}>
    <path d="M1.5 12s3.8-7 10.5-7 10.5 7 10.5 7-3.8 7-10.5 7S1.5 12 1.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

export const EnterIcon = (p) => (
  <Svg {...p}><path d="M4 4h7v16H4" /><polyline points="14 8 18 12 14 16" /><line x1="18" y1="12" x2="9" y2="12" /></Svg>
)

export const ExitIcon = (p) => (
  <Svg {...p}><path d="M13 4h7v16h-7" /><polyline points="8 8 12 12 8 16" /><line x1="12" y1="12" x2="3" y2="12" /></Svg>
)

export const DwellIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="13" r="8" /><polyline points="12 9 12 13 15 15" /><line x1="9" y1="2" x2="15" y2="2" /></Svg>
)

export const ChevronUpIcon = (p) => (
  <Svg strokeWidth={2.6} {...p}><polyline points="6 15 12 9 18 15" /></Svg>
)

export const SendIcon = (p) => (
  <Svg {...p}><path d="M22 2 11 13" /><path d="M22 2 15 22 11 13 2 9z" /></Svg>
)

export const BellIcon = (p) => (
  <Svg {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></Svg>
)

export const SmartphoneIcon = (p) => (
  <Svg {...p}><rect x="6" y="2" width="12" height="20" rx="2.5" /><line x1="12" y1="18" x2="12.01" y2="18" /></Svg>
)

export const FeedIcon = (p) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="8" rx="2" /><line x1="3" y1="16" x2="21" y2="16" /><line x1="3" y1="20" x2="14" y2="20" /></Svg>
)

export const TypeIcon = (p) => (
  <Svg {...p}><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></Svg>
)

export const ImageIcon = (p) => (
  <Svg {...p}><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="9" cy="9" r="1.8" /><path d="m21 15-4.5-4.5L6 21" /></Svg>
)

export const BranchIcon = (p) => (
  <Svg {...p}><line x1="6" y1="6" x2="6" y2="15" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="6" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></Svg>
)
