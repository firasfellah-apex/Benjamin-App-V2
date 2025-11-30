export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './node_modules/streamdown/dist/**/*.js'
  ],
  safelist: ['border', 'border-border'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        borderColor: {
          border: 'hsl(var(--border))',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        education: {
          blue: 'hsl(var(--education-blue))',
          green: 'hsl(var(--education-green))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        info: 'hsl(var(--info))',
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-background': 'var(--gradient-background)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        hover: 'var(--shadow-hover)',
        'elev-1': '0 2px 8px rgba(2,6,23,0.06)',
        'elev-2': '0 8px 24px rgba(2,6,23,0.10)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'fade-in': {
          from: {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'slide-in': {
          from: {
            opacity: '0',
            transform: 'translateX(-20px)',
          },
          to: {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        'gradient-pulse': {
          '0%, 100%': {
            opacity: '0.4',
          },
          '50%': {
            opacity: '0.6',
          },
        },
        'gradient-sweep': {
          '0%, 100%': {
            backgroundPosition: '0% 0%',
          },
          '50%': {
            backgroundPosition: '100% 100%',
          },
        },
        'route-glow-horizontal': {
          '0%': {
            transform: 'translateX(-120%)',
            opacity: '0',
          },
          '30%': {
            opacity: '1',
          },
          '70%': {
            opacity: '1',
          },
          '100%': {
            transform: 'translateX(120%)',
            opacity: '0',
          },
        },
        'route-glow-vertical': {
          '0%': {
            transform: 'translateY(-120%)',
            opacity: '0',
          },
          '30%': {
            opacity: '1',
          },
          '70%': {
            opacity: '1',
          },
          '100%': {
            transform: 'translateY(120%)',
            opacity: '0',
          },
        },
        'route-glow-diagonal': {
          '0%': {
            transform: 'translateX(-120%) translateY(120%)',
            opacity: '0',
          },
          '30%': {
            opacity: '1',
          },
          '70%': {
            opacity: '1',
          },
          '100%': {
            transform: 'translateX(120%) translateY(-120%)',
            opacity: '0',
          },
        },
        // SYNCHRONIZED DASH ANIMATION
        // Path length is normalized to ~80 units.
        // Dash length is 25 units.
        // Start offset: 25 (Just before path start)
        // End offset: -80 (Just after path end)
        'dash-travel': {
          '0%': {
            strokeDashoffset: '25',
            opacity: '0',
          },
          '5%': {
            opacity: '1',
          },
          '45%': {
            opacity: '1',
          },
          '50%': {
            strokeDashoffset: '-80', // IMPACT CENTER
            opacity: '0', // Vanish on impact
          },
          '100%': {
            strokeDashoffset: '-80',
            opacity: '0',
          },
        },
        // DOT PULSE (Synced to hit at 50%)
        'dot-impact': {
          '0%, 45%': {
            transform: 'scale(0)',
            opacity: '0',
          },
          '50%': {
            transform: 'scale(1.2)',
            opacity: '1',
          },
          '55%': {
            transform: 'scale(1)',
            opacity: '1',
          },
          '65%': {
            transform: 'scale(1)',
            opacity: '1',
          },
          '80%': {
            transform: 'scale(0)',
            opacity: '0',
          },
          '100%': {
            transform: 'scale(0)',
            opacity: '0',
          },
        },
        // RADAR SHOCKWAVE (Synced to hit at 50%)
        'radar-shockwave': {
          '0%, 49%': {
            transform: 'scale(0.1)',
            opacity: '0',
          },
          '50%': {
            opacity: '0.8', // Flash on impact
          },
          '80%': {
            transform: 'scale(3)', // Expand out
            opacity: '0',
          },
          '100%': {
            opacity: '0',
          },
        },
        // Keep the old radar-pulse for backward compatibility
        'radar-pulse': {
          '0%': {
            transform: 'scale(0.1)',
            opacity: '0',
          },
          '50%': {
            opacity: '0.8',
          },
          '100%': {
            transform: 'scale(3)', // Expands outward
            opacity: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in': 'slide-in 0.5s ease-out',
        'gradient-pulse': 'gradient-pulse 3s ease-in-out infinite',
        'gradient-sweep': 'gradient-sweep 8s ease-in-out infinite',
        'route-h': 'route-glow-horizontal 1.4s linear infinite',
        'route-v': 'route-glow-vertical 1.4s linear infinite',
        'route-d': 'route-glow-diagonal 1.6s linear infinite',
        'dash-travel': 'dash-travel 3s linear infinite',
        'dot-impact': 'dot-impact 3s ease-out infinite',
        'radar-shockwave': 'radar-shockwave 3s ease-out infinite',
        'radar-pulse': 'radar-pulse 2s ease-out infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    function ({ addUtilities }) {
      addUtilities(
        {
          '.border-t-solid': { 'border-top-style': 'solid' },
          '.border-r-solid': { 'border-right-style': 'solid' },
          '.border-b-solid': { 'border-bottom-style': 'solid' },
          '.border-l-solid': { 'border-left-style': 'solid' },
          '.border-t-dashed': { 'border-top-style': 'dashed' },
          '.border-r-dashed': { 'border-right-style': 'dashed' },
          '.border-b-dashed': { 'border-bottom-style': 'dashed' },
          '.border-l-dashed': { 'border-left-style': 'dashed' },
          '.border-t-dotted': { 'border-top-style': 'dotted' },
          '.border-r-dotted': { 'border-right-style': 'dotted' },
          '.border-b-dotted': { 'border-bottom-style': 'dotted' },
          '.border-l-dotted': { 'border-left-style': 'dotted' },
        },
        ['responsive']
      );
    },
  ],
};
