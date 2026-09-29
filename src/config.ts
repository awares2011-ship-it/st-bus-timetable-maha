/** App-wide constants. Set VITE_SITE_URL at build time for correct canonicals. */
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://example.com');

export const APP_NAME = 'Maharashtra ST Bus Timetable';
