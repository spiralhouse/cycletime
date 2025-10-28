/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Class-based dark mode strategy
  content: [
    "../**/*.html",
    "../**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        /* Brand Colors */
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',  // Primary brand accent
          500: '#0ea5e9',  // Primary CTAs
          600: '#0284c7',  // Hover states
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },

        /* Neutral Scale (Dark-first) */
        neutral: {
          50: '#fafafa',   // Lightest - light mode backgrounds
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',  // Mid-tone - borders, disabled
          600: '#525252',
          700: '#404040',  // Light mode text
          800: '#262626',  // Dark mode elevated surfaces
          850: '#1a1a1a',  // Dark mode cards
          900: '#171717',  // Dark mode primary background
          950: '#0a0a0a',  // Darkest - dark mode deepest backgrounds
        },

        /* Semantic Status Colors */
        status: {
          backlog: {
            bg: '#1e293b',     // slate-800
            text: '#94a3b8',   // slate-400
            border: '#334155', // slate-700
          },
          todo: {
            bg: '#1e3a8a',     // blue-900
            text: '#93c5fd',   // blue-300
            border: '#1e40af', // blue-800
          },
          inProgress: {
            bg: '#854d0e',     // yellow-900
            text: '#fde047',   // yellow-300
            border: '#a16207', // yellow-800
          },
          inReview: {
            bg: '#581c87',     // purple-900
            text: '#d8b4fe',   // purple-300
            border: '#6b21a8', // purple-800
          },
          done: {
            bg: '#14532d',     // green-900
            text: '#86efac',   // green-300
            border: '#166534', // green-800
          },
          canceled: {
            bg: '#1f2937',     // gray-800
            text: '#9ca3af',   // gray-400
            border: '#374151', // gray-700
          },
        },

        /* Issue Type Colors */
        issueType: {
          epic: {
            bg: '#7c2d12',     // orange-900
            text: '#fed7aa',   // orange-200
            icon: '#fb923c',   // orange-400
          },
          story: {
            bg: '#1e3a8a',     // blue-900
            text: '#bfdbfe',   // blue-200
            icon: '#60a5fa',   // blue-400
          },
          subtask: {
            bg: '#134e4a',     // teal-900
            text: '#99f6e4',   // teal-200
            icon: '#2dd4bf',   // teal-400
          },
        },

        /* Feedback Colors */
        feedback: {
          success: {
            bg: '#14532d',     // green-900
            text: '#86efac',   // green-300
            border: '#166534', // green-800
          },
          warning: {
            bg: '#78350f',     // amber-900
            text: '#fcd34d',   // amber-300
            border: '#92400e', // amber-800
          },
          error: {
            bg: '#7f1d1d',     // red-900
            text: '#fca5a5',   // red-300
            border: '#991b1b', // red-800
          },
          info: {
            bg: '#1e3a8a',     // blue-900
            text: '#93c5fd',   // blue-300
            border: '#1e40af', // blue-800
          },
        },
      },

      /* Font Families */
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },

      /* Spacing Scale (4px base unit) */
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '16': '64px',
      },

      /* Border Radius Scale */
      borderRadius: {
        'none': '0px',
        'DEFAULT': '4px',      // Small
        'md': '6px',           // Medium
        'lg': '8px',           // Large
        'xl': '12px',          // XL
        'full': '9999px',      // Pills, avatars
      },

      /* Box Shadow System (Dark mode optimized) */
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',

        // Dark mode variants (lighter shadows for visibility)
        'dark-sm': '0 1px 2px 0 rgb(255 255 255 / 0.05)',
        'dark': '0 1px 3px 0 rgb(255 255 255 / 0.1), 0 1px 2px -1px rgb(255 255 255 / 0.1)',
        'dark-md': '0 4px 6px -1px rgb(255 255 255 / 0.1), 0 2px 4px -2px rgb(255 255 255 / 0.1)',
      },

      /* Typography Scale */
      fontSize: {
        'display': ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        'h1': ['2rem', { lineHeight: '1.25', fontWeight: '700' }],
        'h2': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'h4': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
        'code': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
