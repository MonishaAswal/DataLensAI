/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#060608', // Solid premium deep near-black
        cardBg: '#09090b', // Solid zinc-950
        borderBg: '#18181b', // Solid zinc-900
        slate: {
          50: '#fafafa',
          100: '#f4f4f5',
          101: '#f4f4f5',
          105: '#f4f4f5',
          150: '#e4e4e7',
          200: '#e4e4e7',
          202: '#e4e4e7',
          205: '#d4d4d8',
          250: '#a1a1aa',
          300: '#d4d4d8',
          350: '#71717a',
          355: '#a1a1aa',
          400: '#a1a1aa',
          450: '#52525b',
          455: '#71717a',
          500: '#71717a',
          505: '#52525b',
          550: '#3f3f46',
          555: '#3f3f46',
          600: '#52525b',
          650: '#27272a',
          655: '#27272a',
          700: '#3f3f46',
          800: '#27272a',
          850: '#18181b',
          900: '#18181b',
          950: '#09090b',
          955: '#060608',
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
