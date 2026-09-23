import baseConfig from "./tailwind.config.js"

export default {
  ...baseConfig,
  content: [
    "./src/features/overview/**/*.{js,jsx}",
    "./src/components/ui/{badge,button,card,skeleton,table}.jsx",
  ],
  important: "#timestock-overview-root",
  corePlugins: {
    preflight: false,
  },
}
