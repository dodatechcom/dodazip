import React from 'react'

interface IconProps { size?: number }

/* ─── Toolbar Icons (colorful, refined palette) ─── */

export const IconNew: React.FC<IconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" fill="#3b82f6" fillOpacity="0.12" stroke="#3b82f6" strokeWidth="1.5"/>
    <path d="M15 2v6h6" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.5"/>
    <path d="M10 9v6M7 12h6" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const IconOpen: React.FC<IconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 20V8a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="#d97706" fillOpacity="0.12" stroke="#d97706" strokeWidth="1.5"/>
    <path d="M3 18l2-9h16l-2 9H3z" fill="#d97706" fillOpacity="0.12" stroke="#d97706" strokeWidth="1.5"/>
  </svg>
)

export const IconExtract: React.FC<IconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="3" width="16" height="18" rx="2" fill="#059669" fillOpacity="0.12" stroke="#059669" strokeWidth="1.5"/>
    <path d="M12 8v8M8 12l4 4 4-4" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconAdd: React.FC<IconProps> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="3" width="16" height="18" rx="2" fill="#e11d48" fillOpacity="0.12" stroke="#e11d48" strokeWidth="1.5"/>
    <path d="M12 16V8M8 12l4-4 4 4" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 18h16" stroke="#e11d48" strokeWidth="1.5" strokeOpacity="0.3"/>
  </svg>
)

/* ─── Navigation Icons (monochrome) ─── */

export const IconFolder: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 20V7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="#f59e0b" fillOpacity="0.18" stroke="#f59e0b" strokeWidth="1.5"/>
  </svg>
)

export const IconUp: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconBack: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

/* ─── Search / Filter (monochrome) ─── */

export const IconSearch: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M16.5 16.5L22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const IconClear: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
    <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

/* ─── Status Icons (monochrome) ─── */

export const IconCheck: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconX: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

export const IconLoader: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="spin">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

export const IconEmptyFolder: React.FC<IconProps> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 20V7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round"/>
    <line x1="8" y1="16" x2="14" y2="16" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round"/>
  </svg>
)

/* ─── Theme (monochrome) ─── */

export const IconSun: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const IconMoon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

/* ─── Sort (monochrome) ─── */

export const IconSortAsc: React.FC<IconProps> = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M8 9l4-4 4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconSortDesc: React.FC<IconProps> = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 19V5M8 15l4 4 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

/* ─── File Type Icons (subtle color differentiation) ─── */

export const IconFileGeneric: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 3h9l6 6v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4"/>
    <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4"/>
  </svg>
)

export const IconDzip: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <ellipse cx="12" cy="20.5" rx="8" ry="2" fill="#0f172a" fillOpacity="0.3" />
    <path d="M12 2.5L19.5 6.2L12 10L4.5 6.2Z" fill="#3b82f6" stroke="#93c5fd" strokeWidth="0.8" strokeLinejoin="round" />
    <path d="M19.5 6.2L19.5 15.2L12 19L12 10Z" fill="#1d4ed8" stroke="#2563eb" strokeWidth="0.8" strokeLinejoin="round" />
    <path d="M4.5 6.2L12 10L12 19L4.5 15.2Z" fill="#1e3a8a" stroke="#38bdf8" strokeWidth="0.8" strokeLinejoin="round" />
    <circle cx="8.2" cy="12.6" r="2.2" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.7" />
    <path d="M8.2 11.5v2.2M7.1 12.6h2.2" stroke="#f59e0b" strokeWidth="0.7" strokeLinecap="round" />
  </svg>
)

export const IconWarningRisk: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3L2 21h20L12 3z" fill="#ef4444" fillOpacity="0.15" stroke="#ef4444" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M12 9v5M12 17.5h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

export const IconShieldOk: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L4 5v6.5C4 16.5 7.5 21 12 22c4.5-1 8-5.5 8-10.5V5l-8-3z" fill="#10b981" fillOpacity="0.18" stroke="#10b981" strokeWidth="1.6" strokeLinejoin="round"/>
    <path d="M9 11.5l2 2 4-4" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconZip: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 3h9l6 6v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#0891b2" fillOpacity="0.12" stroke="#0891b2" strokeWidth="1.5"/>
    <path d="M14 3v6h6" stroke="#0891b2" strokeWidth="1.5" strokeOpacity="0.5"/>
    <path d="M8 12h.01M10 14h.01M8 16h.01M10 18h.01" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const IconSevenZ: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 3h9l6 6v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#7c3aed" fillOpacity="0.12" stroke="#7c3aed" strokeWidth="1.5"/>
    <path d="M14 3v6h6" stroke="#7c3aed" strokeWidth="1.5" strokeOpacity="0.5"/>
    <path d="M9 12h6l-4 5" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="9" y1="17" x2="15" y2="17" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const IconRar: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 3h9l6 6v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#ea580c" fillOpacity="0.12" stroke="#ea580c" strokeWidth="1.5"/>
    <path d="M14 3v6h6" stroke="#ea580c" strokeWidth="1.5" strokeOpacity="0.5"/>
    <path d="M12 12v6" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 12h2a2 2 0 0 1 0 4h-2" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconTar: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 4h16v16H4V4z" fill="#78716c" fillOpacity="0.12" stroke="#78716c" strokeWidth="1.5"/>
    <path d="M4 8h16" stroke="#78716c" strokeWidth="1.5" strokeOpacity="0.25"/>
    <line x1="8" y1="12" x2="16" y2="12" stroke="#78716c" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="16" x2="14" y2="16" stroke="#78716c" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
  </svg>
)

export const IconBookmark: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4.5L4 21V4a1 1 0 0 1 1-1z" fill="#d97706" fillOpacity="0.15" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
)

export const IconDuplicate: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="8" y="8" width="14" height="14" rx="2" fill="#8b5cf6" fillOpacity="0.12" stroke="#8b5cf6" strokeWidth="1.5"/>
    <rect x="2" y="2" width="14" height="14" rx="2" fill="#8b5cf6" fillOpacity="0.08" stroke="#8b5cf6" strokeWidth="1.5"/>
  </svg>
)

export const IconPortable: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#10b981" strokeWidth="1.5" fill="none"/>
    <path d="M12 7v5l3 3" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconVolume: React.FC<IconProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="#f59e0b" strokeWidth="1.5" fill="none"/>
    <path d="M8 12h8M12 8v8" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const IconCompressed: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 3h9l6 6v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#dc2626" fillOpacity="0.10" stroke="#dc2626" strokeWidth="1.5"/>
    <path d="M14 3v6h6" stroke="#dc2626" strokeWidth="1.5" strokeOpacity="0.4"/>
    <path d="M8 14l4-4 4 4" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="10" x2="12" y2="18" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const IconRename: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const IconTrash: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
)

export const IconShred: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.6"/>
    <line x1="12" y1="15" x2="12" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const IconSettings: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export const IconGlobe: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

export const IconDisc: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" fill="#0284c7" fillOpacity="0.12" stroke="#0284c7" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="3" stroke="#0284c7" strokeWidth="1.6" />
    <path d="M12 3v2M12 19v2" stroke="#0284c7" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.5" />
  </svg>
)

export const IconPackage: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M16.5 9.4L7.55 4.24a1.78 1.78 0 0 0-1.8 0L2.8 5.94a1.8 1.8 0 0 0-.9 1.56v7a1.8 1.8 0 0 0 .9 1.56l2.95 1.7a1.78 1.78 0 0 0 1.8 0l8.95-5.16a1.8 1.8 0 0 0 .9-1.56v-7a1.8 1.8 0 0 0-.9-1.56z" fill="#059669" fillOpacity="0.12" stroke="#059669" strokeWidth="1.5"/>
    <path d="M2.3 6.8l9.7 5.6 9.7-5.6M12 12.4v9.6" stroke="#059669" strokeWidth="1.5"/>
  </svg>
)

export const IconRefresh: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
)

export const IconHelp: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

export const FileRowIcon: React.FC<{ name: string; isDir: boolean }> = ({ name, isDir }) => {
  if (isDir) return <IconFolder size={16} />
  const lower = name.toLowerCase()
  if (lower.endsWith('.dzip')) return <IconDzip size={16} />
  if (lower.endsWith('.zip')) return <IconZip size={16} />
  if (lower.endsWith('.7z')) return <IconSevenZ size={16} />
  if (lower.endsWith('.rar')) return <IconRar size={16} />
  if (lower.endsWith('.tar') || lower.endsWith('.tgz') || lower.endsWith('.tbz2') || lower.endsWith('.txz') ||
      lower.endsWith('.tar.gz') || lower.endsWith('.tar.bz2') || lower.endsWith('.tar.xz')) return <IconTar size={16} />
  if (lower.endsWith('.iso')) return <IconDisc size={16} />
  if (lower.endsWith('.dmg')) return <IconDisc size={16} />
  if (lower.endsWith('.deb') || lower.endsWith('.ar') || lower.endsWith('.a')) return <IconPackage size={16} />
  if (lower.endsWith('.cab')) return <IconCompressed size={16} />
  if (lower.endsWith('.gz') || lower.endsWith('.bz2') || lower.endsWith('.xz')) return <IconCompressed size={16} />
  return <IconFileGeneric size={16} />
}
