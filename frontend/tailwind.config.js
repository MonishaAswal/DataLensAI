/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        cardBg: 'var(--cardBg)',
        borderBg: 'var(--borderBg)',
        slate: {
          50: 'var(--slate-50)',
          100: 'var(--slate-100)',
          101: 'var(--slate-101)',
          105: 'var(--slate-105)',
          150: 'var(--slate-150)',
          200: 'var(--slate-200)',
          202: 'var(--slate-202)',
          205: 'var(--slate-205)',
          250: 'var(--slate-250)',
          300: 'var(--slate-300)',
          350: 'var(--slate-350)',
          355: 'var(--slate-355)',
          400: 'var(--slate-400)',
          450: 'var(--slate-450)',
          455: 'var(--slate-455)',
          500: 'var(--slate-500)',
          505: 'var(--slate-550)',
          550: 'var(--slate-550)',
          555: 'var(--slate-555)',
          600: 'var(--slate-600)',
          650: 'var(--slate-650)',
          655: 'var(--slate-655)',
          700: 'var(--slate-700)',
          800: 'var(--slate-800)',
          850: 'var(--slate-850)',
          900: 'var(--slate-900)',
          950: 'var(--slate-950)',
          955: 'var(--slate-955)',
        },
        indigo: {
          150: '#c7d2fe',
          550: '#6366f1',
          650: '#4f46e5',
        },
        cyan: {
          150: '#a5f3fc',
        },
        emerald: {
          405: '#34d399',
          450: '#10b981',
          455: '#10b981',
        },
        rose: {
          450: '#f87171',
          455: '#ef4444',
        },
        amber: {
          450: '#fbbf24',
          455: '#f59e0b',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
