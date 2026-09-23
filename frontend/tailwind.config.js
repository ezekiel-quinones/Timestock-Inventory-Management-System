/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
    "!./src/features/overview/**/*.{js,jsx}",
    "!./src/features/products/**/*.{js,jsx}",
    "!./src/features/materials/**/*.{js,jsx}",
    "!./src/features/orders/**/*.{js,jsx}",
    "!./src/features/settings/**/*.{js,jsx}",
    "!./src/features/analytics/**/*.{js,jsx}",
    "!./src/features/reports/**/*.{js,jsx}",
    "!./src/features/transactions/**/*.{js,jsx}",
    "!./src/features/suppliers/**/*.{js,jsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Open Sans", "Segoe UI", "sans-serif"],
        display: ["Poppins", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        auth: "0 28px 80px -32px rgba(15, 43, 68, 0.35)",
      },
    },
  },
  plugins: [],
}
