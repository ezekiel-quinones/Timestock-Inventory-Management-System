import baseConfig from "./tailwind.config.js"

export default {
  ...baseConfig,
  content: [
    "./src/features/materials/**/*.{js,jsx}",
    "./src/features/products/RecipeDialog.jsx",
    "./src/features/products/ProductsNotificationCenter.jsx",
    "./src/components/ui/**/*.{js,jsx}",
  ],
  important: false,
  corePlugins: {
    preflight: true,
  },
}
