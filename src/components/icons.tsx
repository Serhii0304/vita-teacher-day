/** Прості лінійні значки (inline SVG, без емодзі). */
const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

export const IconPlay = () => (
  <svg {...base}>
    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />
  </svg>
)
export const IconPause = () => (
  <svg {...base}>
    <rect x="6.5" y="5.5" width="3.6" height="13" rx="1" fill="currentColor" stroke="none" />
    <rect x="13.9" y="5.5" width="3.6" height="13" rx="1" fill="currentColor" stroke="none" />
  </svg>
)
export const IconVolume = () => (
  <svg {...base}>
    <path d="M4.5 9.5h3l4-3.5v12l-4-3.5h-3z" fill="currentColor" stroke="none" />
    <path d="M15 9a4 4 0 0 1 0 6M17.6 6.6a7.5 7.5 0 0 1 0 10.8" />
  </svg>
)
export const IconMuted = () => (
  <svg {...base}>
    <path d="M4.5 9.5h3l4-3.5v12l-4-3.5h-3z" fill="currentColor" stroke="none" />
    <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
  </svg>
)
export const IconWords = () => (
  <svg {...base}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <path d="M7 11h6M7 14.5h10" />
  </svg>
)
export const IconWordsOff = () => (
  <svg {...base}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" opacity="0.55" />
    <path d="M4 4l16 16" />
  </svg>
)
export const IconText = () => (
  <svg {...base}>
    <path d="M5 4.5h10.5L19 8v11.5H5z" />
    <path d="M8.5 10h7M8.5 13.5h7M8.5 17h4.5" />
  </svg>
)
export const IconReplay = () => (
  <svg {...base}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" />
    <path d="M4.5 4.5v4h4" />
  </svg>
)
export const IconClose = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
