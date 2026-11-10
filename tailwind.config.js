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
          bg: '#09090b',              // Deep matte neutral zinc
          surface: '#18181b',         // Card & drawer surface
          elevated: '#27272a',        // Elevated panel & hover state
          border: '#27272a',          // Crisp hairline border
          'border-focus': '#3f3f46',  // Active / focused border
          text: '#fafafa',            // High-contrast primary text
          muted: '#a1a1aa',           // Secondary label text
          faint: '#71717a',           // Microcopy & placeholders
          primary: '#5e6ad2',         // Solid Linear indigo
          'primary-hover': '#4f5ac4',
          accent: '#3b82f6',          // Clean solid blue
          danger: '#f43f5e',          // Solid flat rose
          'danger-muted': '#2e1017',
          warning: '#f59e0b',         // Solid flat amber
          'warning-muted': '#2b1807',
          success: '#10b981',         // Solid flat emerald
          'success-muted': '#0a2417',
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
