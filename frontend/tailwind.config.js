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
          101: '#f4f4f5', // zinc-100
          105: '#f4f4f5',
          150: '#e4e4e7', // zinc-200
          205: '#d4d4d8', // zinc-300
          250: '#a1a1aa', // zinc-400
          350: '#71717a', // zinc-500
          450: '#52525b', // zinc-600
          550: '#3f3f46', // zinc-700
          650: '#27272a', // zinc-800
          850: '#18181b', // zinc-900
          950: '#09090b', // zinc-955
        },
        indigo: {
          150: '#c7d2fe',
          650: '#4f46e5',
        },
        cyan: {
          150: '#a5f3fc',
        },
        emerald: {
          405: '#34d399',
          450: '#10b981',
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
