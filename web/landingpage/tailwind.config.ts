import type { Config } from 'tailwindcss'

const config: Config = {
  corePlugins: {
    preflight: false
  },
  // important: '#__next',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))'
      },
      colors: {
        'p-bg': 'var(--p-background)',
        's-bg': 'var(--s-background)',
        's-text': 'var(--s-text)',
        'p-text': 'var(--p-text)'
      }
    }
  },
  variants: {
    extend: {
      backdropBlur: ['responsive'],
      backdropFilter: ['responsive']
    }
  },
  plugins: []
}
export default config
