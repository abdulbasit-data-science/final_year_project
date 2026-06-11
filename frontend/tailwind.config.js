module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#3b82f6', hover: '#2563eb' },
        secondary: { DEFAULT: '#64748b', hover: '#475569' },
        danger: { DEFAULT: '#ef4444', hover: '#dc2626' },
        success: { DEFAULT: '#22c55e', hover: '#16a34a' },
        warning: { DEFAULT: '#f59e0b', hover: '#d97706' }
      }
    }
  },
  plugins: []
}
