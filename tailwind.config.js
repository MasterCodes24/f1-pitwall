/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pit: {
          bg: '#0a0a0c',
          panel: '#121216',
          panel2: '#181820',
          border: '#262630',
          text: '#e4e4e7',
          muted: '#7a7a85',
        },
        neon: {
          green: '#39ff8f',
          purple: '#b14aff',
          red: '#ff3b3b',
          yellow: '#ffd23b',
          blue: '#3bb8ff',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Roboto Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 8px rgba(57,255,143,0.55)',
        'glow-purple': '0 0 8px rgba(177,74,255,0.55)',
        'glow-red': '0 0 8px rgba(255,59,59,0.55)',
      },
      gridTemplateColumns: {
        pitwall: '1fr 360px',
      },
      gridTemplateRows: {
        pitwall: '1fr 220px',
      },
    },
  },
  plugins: [],
}