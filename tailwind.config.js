/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './entrypoints/**/*.{html,ts,tsx}',
    './components/**/*.{html,ts,tsx}',
    './utils/**/*.{html,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#141413',              // Tactile matte stone black
          surface: '#1c1b1a',         // Card & drawer warm stone surface
          elevated: '#282725',        // Elevated panel & hover state
          border: '#302f2c',          // Hairline warm border
          'border-focus': '#d97706',  // Amber active/focused border
          text: '#e6e4df',            // Warm tactile paper white
          muted: '#9c9992',           // Secondary stone gray
          faint: '#6e6c66',           // Microcopy & placeholders
          primary: '#d97706',         // Industrial amber / ochre
          'primary-hover': '#b45309', // Darker amber
          accent: '#d97706',          // Industrial amber accent
          danger: '#e11d48',          // Solid crimson / rose
          'danger-muted': '#4c0519',
          warning: '#d97706',         // Industrial amber
          'warning-muted': '#3e2200',
          success: '#16a34a',         // Solid forest green
          'success-muted': '#052e16',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
