/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        st: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        svcOrdinaryBg:  '#fee2e2', svcOrdinaryFg:  '#991b1b', svcOrdinaryRing:  '#fca5a5', svcOrdinary:  '#dc2626',
        svcSemiBg:      '#ffedd5', svcSemiFg:      '#9a3412', svcSemiRing:      '#fdba74', svcSemi:      '#ea580c',
        svcHirkaniBg:   '#fce7f3', svcHirkaniFg:   '#9d174d', svcHirkaniRing:   '#fbcfe8', svcHirkani:   '#db2777',
        svcShivshahiBg: '#ede9fe', svcShivshahiFg: '#5b21b6', svcShivshahiRing: '#c4b5fd', svcShivshahi: '#7c3aed',
        svcShivneriBg:  '#dbeafe', svcShivneriFg:  '#1e40af', svcShivneriRing:  '#93c5fd', svcShivneri:  '#1d4ed8',
        svcAcSleepBg:   '#e0e7ff', svcAcSleepFg:   '#3730a3', svcAcSleepRing:   '#a5b4fc', svcAcSleep:   '#4338ca',
        svcSleeperBg:   '#ccfbf1', svcSleeperFg:   '#115e59', svcSleeperRing:   '#5eead4', svcSleeper:   '#0d9488',
        svcElectricBg:  '#d1fae5', svcElectricFg:  '#065f46', svcElectricRing:  '#6ee7b7', svcElectric:  '#059669',
        svcMidiBg:      '#fef3c7', svcMidiFg:      '#92400e', svcMidiRing:      '#fcd34d', svcMidi:      '#d97706',
        div: {
          pune:          '#dc2626',
          mumbai:        '#0284c7',
          thane:         '#0891b2',
          nashik:        '#059669',
          nagpur:        '#ea580c',
          amravati:      '#c2410c',
          kolhapur:      '#7c3aed',
          satara:        '#db2777',
          sangli:        '#be185d',
          solapur:       '#a16207',
          ahilyanagar:   '#65a30d',
          sambhajinagar: '#9333ea',
          ratnagiri:     '#0d9488',
        },
      },
      fontFamily: {
        sans: [
          '"Noto Sans"',
          '"Noto Sans Devanagari"',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        'vibrant': '0 4px 24px -4px rgba(220, 38, 38, 0.18)',
        'vibrant-lg': '0 8px 32px -6px rgba(220, 38, 38, 0.22)',
        'color-sm': '0 2px 8px -2px',
        'color-md': '0 4px 16px -4px',
        'color-lg': '0 8px 24px -6px',
      },
      keyframes: {
        softpulse: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '.65' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        softpulse: 'softpulse 2.4s ease-in-out infinite',
        shimmer: 'shimmer 3s ease-in-out infinite',
      },
    },
  },
  safelist: [
    { pattern: /(bg|text|ring)-svc(Ordinary|Semi|Hirkani|Shivshahi|Shivneri|AcSleep|Sleeper|Electric|Midi)(Bg|Fg|Ring)?/ },
    { pattern: /(bg|text|ring)-div-(pune|mumbai|thane|nashik|nagpur|amravati|kolhapur|satara|sangli|solapur|ahilyanagar|sambhajinagar|ratnagiri)/ },
    { pattern: /(from|to)-(red|orange|amber|yellow|lime|emerald|teal|cyan|sky|blue|violet|purple|pink|rose|fuchsia)-(400|500|600|700)/ },
  ],
  plugins: [],
};
