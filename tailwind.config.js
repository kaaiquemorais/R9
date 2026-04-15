/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF6A00',
        'primary-light': '#FF8C42',
        background: '#0D0D0D',
        surface: '#161616',
        'surface-2': '#1E1E1E',
        'surface-3': '#252525',
        text: '#F5F5F5',
        'text-muted': '#A0A0A0',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,106,0,0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(255,106,0,0.7)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #FF6A00, #FF8C42)',
        'gradient-radial-glow': 'radial-gradient(ellipse at center, rgba(255,106,0,0.15) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
}
