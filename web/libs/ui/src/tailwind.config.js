import tokens from "./tokens/tokens";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./apps/**/*.{js,jsx,ts,tsx}",
    "./libs/app-common/src/**/*.{js,jsx,ts,tsx}",
    "./libs/core/src/**/*.{js,jsx,ts,tsx}",
    "./libs/editor/src/**/*.{js,jsx,ts,tsx}",
    "./libs/datamanager/src/**/*.{js,jsx,ts,tsx}",
    "./libs/ui/src/**/*.{js,jsx,ts,tsx}",
    "./libs/storybook/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    letterSpacing: tokens.typography.letterSpacing,
    fontWeight: tokens.typography.fontWeight,
    fontFamily: tokens.typography.fontFamily,
    lineHeight: tokens.typography.lineHeight,
    fontSize: tokens.typography.fontSize,
    spacing: tokens.spacing,
    extend: {
      colors: {
        // DO NOT USE THESE COLORS
        // Refer to the Figma tokens instead
        // These are values from the old tailwind.config.js and Shadcn/UI introduction
        current: "currentColor",
        transparent: "transparent",

        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Add all colors from tokens
        ...tokens.colors,
      },
      maxWidth: {
        "c-1390": "86.875rem",
        "c-1315": "82.188rem",
        "c-1280": "80rem",
        "c-1235": "77.188rem",
        "c-1154": "72.125rem",
        "c-1016": "63.5rem",
      },
      zIndex: {
        99999: "99999",
        999: "999",
        1: "1",
      },
      opacity: {
        65: ".65",
      },
      transitionProperty: { width: "width" },
      boxShadow: {
        "solid-l": "0px 10px 120px 0px rgba(45, 74, 170, 0.1)",
        "solid-2": "0px 2px 10px rgba(122, 135, 167, 0.05)",
        "solid-3": "0px 6px 90px rgba(8, 14, 40, 0.04)",
        "solid-4": "0px 6px 90px rgba(8, 14, 40, 0.1)",
        "solid-5": "0px 8px 24px rgba(45, 74, 170, 0.08)",
        "solid-6": "0px 8px 24px rgba(10, 16, 35, 0.08)",
        "solid-7": "0px 30px 50px rgba(45, 74, 170, 0.1)",
        "solid-8": "0px 12px 120px rgba(45, 74, 170, 0.06)",
        "solid-9": "0px 12px 30px rgba(45, 74, 170, 0.06)",
        "solid-10": "0px 8px 30px rgba(45, 74, 170, 0.06)",
        "solid-11": "0px 6px 20px rgba(45, 74, 170, 0.05)",
        "solid-12": "0px 2px 10px rgba(0, 0, 0, 0.05)",
        "solid-13": "0px 2px 19px rgba(0, 0, 0, 0.05)",
        "border-1": "inset 0 0 0 1px rgba(0,0,0,1)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",

        // Add all border radii from tokens
        ...tokens.cornerRadius,
      },
      backgroundPosition: {
        "shimmer-start": "left -2em top 0",
      },
      backgroundSize: {
        "shimmer-size": "2em 100%",
      },
      keyframes: {
        line: {
          "0%, 100%": { transform: "translateY(100%)" },
          "50%": { transform: "translateY(0)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          from: { "background-position": "left -2em top 0" },
          to: { "background-position": "right -2em top 0" },
        },
      },
      animation: {
        line1: "line 3s linear infinite",
        line2: "line 6s linear infinite",
        line3: "line 9s linear infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.3s ease infinite",
      },
    },
  },
  corePlugins: {
    preflight: true,
  },
  plugins: [
    // ...
    require("tailwind-scrollbar"),
  ],
};
