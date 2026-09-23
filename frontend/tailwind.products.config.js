import baseConfig from "./tailwind.config.js"

export default {
  ...baseConfig,
  content: [
    "./src/features/products/**/*.{js,jsx}",
    "./src/components/ui/**/*.{js,jsx}",
  ],
  important: false,
  corePlugins: {
    preflight: true,
  },
}
