/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark-Mode-First Theme
        background: {
          DEFAULT: '#0a0a0a',
          secondary: '#1a1a1a',
          tertiary: '#2a2a2a',
        },
        foreground: {
          DEFAULT: '#ffffff',
          secondary: '#a0a0a0',
          muted: '#666666',
        },
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#1d4ed8',
        },
        fire: {
          DEFAULT: '#ef4444',
          dark: '#dc2626',
        },
        ems: {
          DEFAULT: '#f97316',
          dark: '#ea580c',
        },
        mission: {
          DEFAULT: '#fbbf24',
          dark: '#f59e0b',
        }
      },
      backgroundColor: {
        'background': '#0a0a0a',
        'background-secondary': '#1a1a1a', 
        'background-tertiary': '#2a2a2a',
      },
      textColor: {
        'foreground': '#ffffff',
        'foreground-secondary': '#a0a0a0',
        'foreground-muted': '#666666',
      }
    },
  },
  plugins: [],
  darkMode: 'class', // Enable dark mode with class strategy
}