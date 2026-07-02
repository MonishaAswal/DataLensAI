/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b0f19', // Slate-950 base
        cardBg: 'rgba(17, 24, 39, 0.7)', // Slate-900 transparent
        borderBg: 'rgba(255, 255, 255, 0.08)',
        slate: {
          101: '#cbd5e1',
          105: '#cbd5e1',
          150: '#cbd5e1',
          205: '#94a3b8',
          250: '#94a3b8',
          350: '#94a3b8',
          450: '#64748b',
          550: '#475569',
          650: '#334155',
          850: '#1e293b',
        },
        indigo: {
          150: '#a5b4fc',
        },
        cyan: {
          150: '#67e8f9',
        },
        emerald: {
          405: '#34d399',
          450: '#34d399',
        },
        rose: {
          450: '#f87171',
          455: '#f87171',
        },
        amber: {
          450: '#fbbf24',
          455: '#fbbf24',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
