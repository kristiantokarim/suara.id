/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Indonesian-inspired color palette
      colors: {
        // Primary colors inspired by Indonesian flag and culture
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',  // Main red from Indonesian flag
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',  // Neutral blue-gray
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Accent colors inspired by Indonesian nature
        accent: {
          emerald: '#10b981',  // Indonesian forests
          amber: '#f59e0b',    // Indonesian sunsets
          blue: '#3b82f6',     // Indonesian seas
        },
        // Semantic colors
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
        // Trust level indicators
        trust: {
          basic: '#94a3b8',    // Gray for basic users
          verified: '#3b82f6', // Blue for verified users
          premium: '#10b981',  // Green for premium users
        },
        // Category colors for issues
        category: {
          infrastructure: '#ef4444',  // Red
          cleanliness: '#10b981',     // Green
          lighting: '#f59e0b',        // Amber
          water: '#3b82f6',          // Blue
          environment: '#22c55e',     // Light green
          safety: '#dc2626',         // Dark red
        },
      },
      // Indonesian-friendly typography
      fontFamily: {
        sans: [
          'Inter',
          'Segoe UI',
          'Noto Sans',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        display: [
          'Poppins',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      // Spacing optimized for mobile-first Indonesian users
      spacing: {
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px
        '128': '32rem',   // 512px
      },
      // Animation for better mobile experience
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'bounce-light': 'bounceLight 1s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceLight: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      // Mobile-optimized breakpoints
      screens: {
        'xs': '375px',    // Small phones
        'sm': '640px',    // Large phones
        'md': '768px',    // Tablets
        'lg': '1024px',   // Small laptops
        'xl': '1280px',   // Desktop
        '2xl': '1536px',  // Large desktop
      },
      // Shadow system for depth
      boxShadow: {
        'soft': '0 2px 8px 0 rgba(0, 0, 0, 0.1)',
        'medium': '0 4px 12px 0 rgba(0, 0, 0, 0.15)',
        'strong': '0 8px 24px 0 rgba(0, 0, 0, 0.2)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
      },
      // Border radius for Indonesian design preferences
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    // Custom plugin for Indonesian-specific utilities
    function({ addUtilities }) {
      const newUtilities = {
        // RTL support utilities (though Indonesian is LTR, good for future expansion)
        '.rtl': {
          direction: 'rtl',
        },
        '.ltr': {
          direction: 'ltr',
        },
        // Touch-friendly sizing
        '.touch-target': {
          minHeight: '44px',
          minWidth: '44px',
        },
        // High contrast mode utilities
        '.high-contrast': {
          filter: 'contrast(1.2) saturate(1.1)',
        },
        // Indonesian flag gradient
        '.bg-indonesia': {
          background: 'linear-gradient(to bottom, #ef4444 50%, #ffffff 50%)',
        },
      }
      addUtilities(newUtilities)
    },
  ],
}