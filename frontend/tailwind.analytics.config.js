import baseConfig from "./tailwind.config.js"

export default {
  ...baseConfig,
  content: [
    "./src/features/analytics/**/*.{js,jsx}",
    "./src/components/ui/{alert,badge,button,card,dialog,skeleton}.jsx",
  ],
  important: false,
  corePlugins: {
    preflight: true,
  },
}
