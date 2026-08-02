/**
 * Иконки — инлайновый SVG, наследуют currentColor и размер шрифта.
 * Никаких иконочных шрифтов и внешних библиотек: вес нулевой, цвет управляется CSS.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (p: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  width: 20,
  height: 20,
  "aria-hidden": true,
  ...p,
});

export const IconClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const IconCode = (p: P) => (
  <svg {...base(p)}>
    <path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M13.5 5l-3 14" />
  </svg>
);

export const IconFactory = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 20h18M4.5 20v-8l5 3v-3l5 3V6.5h5V20" />
    <path d="M17 10.5h2M17 14.5h2" />
  </svg>
);

export const IconBus = (p: P) => (
  <svg {...base(p)}>
    <rect x="2.5" y="7.5" width="19" height="9" rx="2" />
    <path d="M6 7.5v9M10 7.5v9M14 7.5v9M18 7.5v9" />
  </svg>
);

export const IconTap = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 5.5h18M12 5.5v4" />
    <rect x="7.5" y="9.5" width="9" height="9" rx="2" />
    <path d="M10.5 13.5h3" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const IconAlert = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4.5 2.8 20h18.4L12 4.5Z" />
    <path d="M12 10v4.2M12 17.2h.01" />
  </svg>
);

export const IconShield = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3 5 5.8v5.4c0 4.2 2.9 7.6 7 9.8 4.1-2.2 7-5.6 7-9.8V5.8L12 3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const IconBolt = (p: P) => (
  <svg {...base(p)}>
    <path d="M13.5 2.5 5 13.5h6l-.5 8L19 10.5h-6l.5-8Z" />
  </svg>
);

export const IconLink = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 6.8" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 1 0 11 18.7l1.5-1.5" />
  </svg>
);

export const IconPrint = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 9V3.5h10V9" />
    <rect x="3.5" y="9" width="17" height="7" rx="2" />
    <path d="M7 14h10v6.5H7z" />
  </svg>
);

export const IconCopy = (p: P) => (
  <svg {...base(p)}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
    <path d="M15.5 5.5v-.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h.5" />
  </svg>
);

export const IconServer = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4" width="17" height="6" rx="2" />
    <rect x="3.5" y="14" width="17" height="6" rx="2" />
    <path d="M7 7h.01M7 17h.01" />
  </svg>
);

export const IconGauge = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 17a8 8 0 1 1 16 0" />
    <path d="m12 17 4.5-5.5" />
    <circle cx="12" cy="17" r="1.4" />
  </svg>
);

export const IconLayers = (p: P) => (
  <svg {...base(p)}>
    <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
    <path d="m4 12.5 8 4.3 8-4.3M4 16.8l8 4.2 8-4.2" />
  </svg>
);

export const IconTable = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M9.5 9.5v10M15 9.5v10" />
  </svg>
);

export const IconPalette = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 2-1.8 0-1.6-1.4-1.9-1.4-3 0-.8.7-1.4 1.6-1.4h1.6a4.7 4.7 0 0 0 4.7-4.7C20.5 6.2 16.7 3.5 12 3.5Z" />
    <circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15.8" cy="10" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconArrow = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />
  </svg>
);
