import type { SVGProps } from 'react';

/* Small inline icon set (no icon library dependency). Currentcolor-based. */
type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...p,
});

export const SearchIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
export const SwapIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 16V4m0 0L3 8m4-4 4 4" />
    <path d="M17 8v12m0 0 4-4m-4 4-4-4" />
  </svg>
);
export const StarIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 17l-5.4 2.6 1-6L3.3 9.4l6-.9L12 3z" />
  </svg>
);
export const StarFilledIcon = (p: P) => (
  <svg {...base({ ...p, fill: 'currentColor' })}>
    <path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 17l-5.4 2.6 1-6L3.3 9.4l6-.9L12 3z" />
  </svg>
);
export const ClockIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const ArrowRightIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14m0 0-6-6m6 6-6 6" />
  </svg>
);
export const ArrowDownIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14m0 0 6-6m-6 6-6-6" />
  </svg>
);
export const ChevronRightIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
export const BackIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M19 12H5m0 0 6 6m-6-6 6-6" />
  </svg>
);
export const GlobeIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 2.5 15 0 18M12 3c-2.5 2.7-2.5 15 0 18" />
  </svg>
);
export const WifiOffIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M2 8.8a15 15 0 0 1 4.2-2.5M10.7 5.1A15 15 0 0 1 22 8.8" />
    <path d="M5 12.6a10 10 0 0 1 3-1.9M15 10.4a10 10 0 0 1 4 2.2" />
    <path d="M8.5 16.4a5 5 0 0 1 6.9 0" />
    <path d="M12 20h.01M2 2l20 20" />
  </svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 12 5 5L20 7" />
  </svg>
);
export const InstallIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
    <path d="M5 21h14" />
  </svg>
);
export const PinIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
export const InfoIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
export const BusIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="13" rx="2" />
    <path d="M4 11h16M8 4v7M16 4v7" />
    <circle cx="8" cy="19" r="1.5" />
    <circle cx="16" cy="19" r="1.5" />
  </svg>
);
export const BellIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);
export const TicketIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 9a3 3 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a3 3 0 0 0 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" />
    <path d="M13 5v2M13 17v2M13 11v2" />
  </svg>
);
